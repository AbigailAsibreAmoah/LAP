import { alignWords, assessSpokenResponse, dueToday, nextReview, reviewStreak, scorePronunciation, seedContent, SPEAKING_SCENARIOS, VOCABULARY } from '@laporte/shared';
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

describe('spaced repetition', () => {
  it('spaces reviews out as words are known, and brings missed words back today', () => {
    expect(nextReview(undefined, 'good', '2026-10-26')).toEqual({ box: 1, dueOn: '2026-10-27', days: 1 });
    expect(nextReview({ box: 3 }, 'good', '2026-10-26').days).toBe(16);
    expect(nextReview({ box: 3 }, 'again', '2026-10-26')).toEqual({ box: 0, dueOn: '2026-10-26', days: 0 });
  });

  it('builds today’s deck (due words first) and keeps the streak', () => {
    const s = seedContent();
    const deck = dueToday(VOCABULARY, s, 'lrn-ama', '2026-10-26');
    expect(deck.due.map((v) => v.id)).toEqual(['v1', 'v2']);
    expect(deck.fresh.map((v) => v.id)).not.toContain('v3');
    expect(reviewStreak(s, 'lrn-ama', '2026-10-26')).toBe(3);
  });

  it('records a review on the server for the learner only', async () => {
    const r = await request(app).post('/api/me/vocabulary/v1/review').send({ grade: 'good' });
    expect(r.status).toBe(200);
    const day = (r.body.review.lastAt as string).slice(0, 10);
    const in3 = new Date(Date.parse(day + 'T00:00:00Z') + 3 * 86_400_000).toISOString().slice(0, 10);
    expect(r.body.review).toMatchObject({ vocabId: 'v1', box: 2, dueOn: in3 });
    expect(r.body.state.reviewDays.find((d: { day: string }) => d.day === day).count).toBeGreaterThanOrEqual(1);
    expect((await request(app).post('/api/me/vocabulary/nope/review').send({ grade: 'good' })).status).toBe(404);
    expect((await request(app).post('/api/me/vocabulary/v1/review').set('x-demo-user', 'tut-sophie').send({ grade: 'good' })).status).toBe(403);
  });
});

describe('speech scoring', () => {
  it('marks each word as understood or not, ignoring accents and punctuation', () => {
    const a = alignWords('Je ne partage pas tout à fait votre avis.', 'je partage pas tout a fait votre avis');
    expect(a.words.map((w) => w.ok)).toEqual([true, false, true, true, true, true, true, true, true]);
    expect(scorePronunciation('Bonjour, enchanté', ['bonjour enchante'], 0.92).score).toBeGreaterThanOrEqual(95);
    expect(scorePronunciation('Bonjour, enchanté', ['bonsoir'], 0.9).score).toBeLessThan(45);
  });

  it('gives real feedback on a spoken scenario answer', () => {
    const sc = SPEAKING_SCENARIOS[0];
    const good = assessSpokenResponse(sc, sc.sampleResponse, 14, 0.9);
    expect(good.simulated).toBe(false);
    expect(good.used.length).toBeGreaterThan(0);
    const short = assessSpokenResponse(sc, 'oui merci', 3, 0.9);
    expect(short.vocabulary).toBeLessThan(good.vocabulary);
    expect(short.notes.some((n) => n.en.includes('words'))).toBe(true);
  });
});
