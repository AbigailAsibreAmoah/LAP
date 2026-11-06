import { answerPoints, kidProgress, providerFor, quizFor, KID_UNITS, safeNickname, seedContent } from '@laporte/shared';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { contentStore } from '../src/repositories/contentStore';
import { resetDemoStore } from '../src/repositories/demoStore';
import { liveGameService } from '../src/services/kidsService';

const app = createApp();
beforeEach(() => {
  resetDemoStore();
  contentStore.reset();
  liveGameService.reset();
});

describe('kids profiles', () => {
  it('belong to the parent: others and tutors never see them', async () => {
    const created = await request(app).post('/api/kids').send({ name: 'Esi', age: 7, level: 'A1', avatar: 2, pin: '4321' });
    expect(created.status).toBe(201);
    expect(created.body.kid.nickname).not.toContain('Esi');
    expect(created.body.kid.settings.externalGames).toBe(false);
    expect((await request(app).get('/api/content')).body.kids.map((k: { name: string }) => k.name)).toEqual(['Kwame', 'Esi']);
    expect((await request(app).get('/api/content').set('x-demo-user', 'lrn-kofi')).body.kids).toEqual([]);
    expect((await request(app).get('/api/content').set('x-demo-user', 'tut-sophie')).body.kids).toEqual([]);
    expect((await request(app).patch('/api/kids/kid-kwame').set('x-demo-user', 'lrn-kofi').send({ settings: { dailyMinutes: 60 } })).status).toBe(403);
    expect((await request(app).post('/api/kids').set('x-demo-user', 'tut-sophie').send({ name: 'Esi', age: 7, level: 'A1', avatar: 0, pin: '1234' })).status).toBe(403);
  });

  it('records games only when the parent has them switched on, and validates scores', async () => {
    expect((await request(app).post('/api/kids/activity').send({ kidId: 'kid-kwame', unitId: 'ku-animaux', game: 'quiz', score: 9, total: 6 })).status).toBe(422);
    await request(app).patch('/api/kids/kid-kwame').send({ settings: { games: { builder: false } } });
    expect((await request(app).post('/api/kids/activity').send({ kidId: 'kid-kwame', unitId: 'ku-bonjour', game: 'builder', score: 5, total: 5 })).status).toBe(403);
    const ok = await request(app).post('/api/kids/activity').send({ kidId: 'kid-kwame', unitId: 'ku-bonjour', game: 'listen', score: 6, total: 6 });
    expect(ok.body.activity.stars).toBe(3);
  });

  it('opens every world for now', () => {
    const s = seedContent();
    const p = kidProgress(s, 'kid-kwame');
    expect(p.units.every((u) => u.unlocked)).toBe(true);
    expect(p.totalStars).toBe(7);
  });

  it('accepts outside games only from approved platforms over https, added by staff', async () => {
    expect(providerFor('https://kahoot.it/challenge/123')).toBe('kahoot');
    expect(providerFor('https://wordwall.net/resource/1')).toBe('wordwall');
    expect(providerFor('http://kahoot.it/')).toBeNull();
    expect(providerFor('https://kahoot.it.evil.com/')).toBeNull();
    expect((await request(app).post('/api/kids/external-games').send({ unitId: 'ku-bonjour', url: 'https://quizlet.com/x', title: 'Greetings' })).status).toBe(403);
    expect((await request(app).post('/api/kids/external-games').set('x-demo-user', 'tut-aicha').send({ unitId: 'ku-bonjour', url: 'https://example.com/x', title: 'Greetings' })).status).toBe(422);
    expect((await request(app).post('/api/kids/external-games').set('x-demo-user', 'tut-aicha').send({ unitId: 'ku-bonjour', url: 'https://quizlet.com/x', title: 'Greetings' })).status).toBe(201);
  });
});

describe('kids books', () => {
  it('keeps a private library and the parent’s weekly book choice on the child’s profile', async () => {
    const r = await request(app).patch('/api/kids/kid-kwame').send({ library: ['bk-baobab', 'bk-tambour'], bookPick: { week: '2026-W45', bookIds: ['bk-tambour', 'bk-lion', 'bk-radio', 'bk-lettre'] } });
    expect(r.status).toBe(200);
    expect(r.body.kid.library).toEqual(['bk-baobab', 'bk-tambour']);
    expect(r.body.kid.bookPick.bookIds).toHaveLength(4);
    // No more than four books a week.
    expect((await request(app).patch('/api/kids/kid-kwame').send({ bookPick: { week: '2026-W45', bookIds: ['a', 'b', 'c', 'd', 'e'] } })).status).toBe(400);
    // Another family can neither see nor change it.
    expect((await request(app).patch('/api/kids/kid-kwame').set('x-demo-user', 'lrn-kofi').send({ library: [] })).status).toBe(403);
    expect((await request(app).get('/api/content').set('x-demo-user', 'lrn-kofi')).body.kids).toEqual([]);
  });
});

describe('game rules', () => {
  it('builds quizzes with exactly one right answer and rewards speed', () => {
    for (const unit of KID_UNITS) for (const q of quizFor(unit, 5)) expect(q.answer).toBeGreaterThanOrEqual(0);
    expect(answerPoints(true, 0, 20_000, 0)).toBe(1000);
    expect(answerPoints(true, 20_000, 20_000, 0)).toBe(500);
    expect(answerPoints(false, 0, 20_000, 3)).toBe(0);
    expect(safeNickname(3, [])).toMatch(/^\p{L}+ \p{L}+$/u);
  });
});

describe('live class games', () => {
  it('runs a full game: host creates, child joins by code, answers, podium', async () => {
    const tutor = (r: request.Test) => r.set('x-demo-user', 'tut-aicha');
    expect((await request(app).post('/api/games').send({ unitId: 'ku-couleurs' })).status).toBe(403);
    const created = await tutor(request(app).post('/api/games').send({ unitId: 'ku-couleurs' }));
    const code = created.body.code as string;
    expect(code).toBe('123456'); // demo: one fixed code

    // Someone else's child cannot be joined; a parent who switched live games off is refused.
    expect((await request(app).post(`/api/games/${code}/join`).set('x-demo-user', 'lrn-kofi').send({ kidId: 'kid-kwame' })).status).toBe(403);
    const joined = await request(app).post(`/api/games/${code}/join`).send({ kidId: 'kid-kwame' });
    expect(joined.status).toBe(200);
    expect(joined.body.me.nickname).toBe('Lion Doré');
    const playerId = joined.body.me.id as string;

    await tutor(request(app).post(`/api/games/${code}/advance`));
    const asPlayer = await request(app).get(`/api/games/${code}?player=${playerId}`);
    expect(asPlayer.body.phase).toBe('question');
    expect(asPlayer.body.question.answer).toBe(-1); // hidden until the reveal

    for (let i = 0; i < asPlayer.body.count; i++) {
      const host = await tutor(request(app).get(`/api/games/${code}`));
      // The host screen is shown to the class, so it doesn't reveal the answer early either.
      expect(host.body.question.answer).toBe(-1);
      const view = await request(app).post(`/api/games/${code}/answer`).send({ playerId, index: i, choice: 0 });
      expect(view.body.phase).toBe('reveal'); // everyone has answered
      expect(view.body.question.answer).toBeGreaterThanOrEqual(0);
      await tutor(request(app).post(`/api/games/${code}/advance`));
    }
    const end = await request(app).get(`/api/games/${code}?player=${playerId}`);
    expect(end.body.phase).toBe('podium');
    expect(end.body.ranking[0].nickname).toBe('Lion Doré');
    expect((await request(app).post(`/api/games/${code}/join`).send({ kidId: 'kid-kwame' })).status).toBe(200); // same child rejoining is fine

    await request(app).patch('/api/kids/kid-kwame').send({ settings: { liveGames: false } });
    const another = await tutor(request(app).post('/api/games').send({ unitId: 'ku-animaux' }));
    expect((await request(app).post(`/api/games/${another.body.code}/join`).send({ kidId: 'kid-kwame' })).status).toBe(403);
  });
});

describe('startup snapshot privacy', () => {
  it('only contains what the requesting user may see', async () => {
    const mine = await request(app).get('/api/demo/snapshot');
    expect(mine.status).toBe(200);
    expect(mine.body.content.kids.map((k: { id: string }) => k.id)).toContain('kid-kwame');
    // Another family's snapshot must not include Kwame's profile.
    const other = await request(app).get('/api/demo/snapshot').set('x-demo-user', 'lrn-kofi');
    expect(other.body.content.kids).toEqual([]);
  });
});
