import { accessLevel, canBuyLevel, canStudy, courseOpen, courseRange, COURSES } from '@laporte/shared';
import { right, takePlacement, wrong } from './placementHelper';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { contentStore } from '../src/repositories/contentStore';
import { resetDemoStore } from '../src/repositories/demoStore';

const app = createApp();
beforeEach(() => {
  resetDemoStore();
  contentStore.reset();
});
const skip = { answers: {}, writingSample: '', goals: [], hoursPerWeek: 3, preferredTimes: ['evening'] };
const writing = 'Je travaille à Accra dans une banque et je voudrais parler français avec nos partenaires de Lomé et de Dakar.';

describe('placement sets the real level', () => {
  it('scores from the actual answers, per level', async () => {
    // Right on A1 and A2, wrong from B1 up → A2.
    const res = await takePlacement(app, (q) => (['A1', 'A2'].includes(q.level) ? right(q) : wrong(q)));
    expect(res.body.result.level).toBe('A2');
    expect(res.body.result.scores.A1).toEqual({ correct: 3, total: 3 });
    expect(res.body.result.scores.B1.correct).toBe(0);
    expect(res.body.learner.level).toBe('A2');
  });

  it('puts a learner who skips at A1, and lets them take the test later', async () => {
    const skipped = await request(app).post('/api/me/placement').send(skip);
    expect(skipped.body.learner.level).toBe('A1');
    const taken = await takePlacement(app, right);
    expect(taken.body.learner.level).toBe('C2');
    // A real result can't be retaken straight away (that would skip paying for levels).
    expect((await takePlacement(app, right)).status).toBe(409);
  });

  it('never sends the answer key, shuffles options per attempt and refuses answers without an attempt', async () => {
    const a = await request(app).post('/api/me/placement/attempt');
    expect(a.status).toBe(201);
    expect(a.body.questions).toHaveLength(18);
    expect(JSON.stringify(a.body)).not.toContain('"answer"');
    const noAttempt = await request(app).post('/api/me/placement').send({ answers: { 'p-a1-1': 0 }, writingSample: writing, goals: [], hoursPerWeek: 3, preferredTimes: [] });
    expect(noAttempt.status).toBe(422);
    expect(noAttempt.body.error.code).toBe('attempt_required');
  });
});

describe('courses follow the level', () => {
  it('locks lessons above the learner’s level on the server', async () => {
    await request(app).post('/api/me/placement').send(skip); // A1
    const a2Lesson = contentStore.get().lessons.find((l) => l.level === 'A2' && l.status === 'published')!;
    const blocked = await request(app).post(`/api/content/lessons/${a2Lesson.id}/complete`).send({});
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('level_locked');
  });

  it('opens a level only after the payment for it is verified, one level at a time', async () => {
    await request(app).post('/api/me/placement').send(skip); // A1
    expect((await request(app).post('/api/payments/initialize').send({ planId: 'level-B1', method: 'card', provider: 'Card •••• 4242' })).status).toBe(409);
    const init = await request(app).post('/api/payments/initialize').send({ planId: 'level-A2', method: 'mobile-money', provider: 'MTN MoMo' });
    expect(init.status).toBe(201);
    expect((await request(app).get('/api/me')).body.unlockedLevel).toBeUndefined();
    const verified = await request(app).post(`/api/payments/${init.body.payment.reference}/verify`);
    expect(verified.body.learner.unlockedLevel).toBe('A2');
    const a2Lesson = contentStore.get().lessons.find((l) => l.level === 'A2' && l.status === 'published')!;
    expect((await request(app).post(`/api/content/lessons/${a2Lesson.id}/complete`).send({})).status).toBe(200);
  });

  it('works out course access from the course’s first level', () => {
    const a1 = { level: 'A1' as const };
    const business = COURSES.find((c) => c.id === 'crs-business')!;
    expect(courseRange(business)).toEqual(['A2', 'C1']);
    expect(courseOpen(a1, business)).toBe(false);
    expect(courseOpen({ level: 'A1', unlockedLevel: 'A2' }, business)).toBe(true);
    expect(accessLevel({ level: 'B1', unlockedLevel: 'A2' })).toBe('B1');
    expect(canBuyLevel(a1, 'A2')).toBe(true);
    expect(canBuyLevel(a1, 'B1')).toBe(false);
    // Only the learner's own level: nothing below the placement level opens either.
    expect(canStudy({ level: 'B1' }, 'A2')).toBe(false);
    expect(canStudy({ level: 'B1' }, 'B1')).toBe(true);
    expect(canStudy({ level: 'B1', unlockedLevel: 'B2' }, 'B2')).toBe(true);
    expect(courseOpen({ level: 'B1' }, COURSES.find((c) => c.id === 'crs-everyday')!)).toBe(false);
  });
});
