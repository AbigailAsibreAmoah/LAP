import { COHORT_CAPACITY, leaderboard, levelFor, phraseOfDay, seedContent } from '@laporte/shared';
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
const SOPHIE = 'tut-sophie';

describe('sessions: purpose and price', () => {
  it('makes the first one-on-one conversation free, then charges a credit', async () => {
    const first = await request(app).post('/api/bookings').send({ tutorId: 'tut-sophie', start: '2026-10-27T12:00:00Z', topic: 'Conversation', purpose: 'conversation' });
    expect(first.status).toBe(201);
    expect(first.body.booking.freeIntro).toBe(true);
    expect(first.body.creditsRemaining).toBe(3);
    const slots = (await request(app).get('/api/tutors/tut-sophie/availability?date=2026-10-28')).body as { start: string; available: boolean }[];
    const open = slots.find((s) => s.available)!;
    const second = await request(app).post('/api/bookings').send({ tutorId: 'tut-sophie', start: open.start, topic: 'Conversation', purpose: 'conversation' });
    expect(second.body.booking.freeIntro).toBeUndefined();
    expect(second.body.creditsRemaining).toBe(2);
  });

  it('allows a paid catch-up only for a group class the learner missed (no recordings)', async () => {
    const wrong = await request(app).post('/api/bookings').send({ tutorId: 'tut-sophie', start: '2026-10-27T12:00:00Z', topic: 'Catch-up', purpose: 'catch-up', missedSessionId: 'cs-b1' });
    expect(wrong.status).toBe(422);
    const ok = await request(app).post('/api/bookings').send({ tutorId: 'tut-sophie', start: '2026-10-27T12:00:00Z', topic: 'Catch-up', purpose: 'catch-up', missedSessionId: 'cs-b2' });
    expect(ok.status).toBe(201);
    expect(ok.body.booking.creditCost).toBe(1);
  });
});

describe('groups', () => {
  it(`caps groups at ${COHORT_CAPACITY} learners`, async () => {
    for (const id of ['lrn-kofi', 'lrn-chinedu']) expect((await request(app).post('/api/community/cohorts/coh-biz-a2/join').set('x-demo-user', id)).status).toBe(200);
    const full = await request(app).post('/api/community/cohorts/coh-biz-a2/join').set('x-demo-user', 'lrn-yaw');
    expect(full.status).toBe(409);
    expect(full.body.error.code).toBe('cohort_full');
  });

  it('shows the instructor every answer but a learner only their own', async () => {
    const tutor = await request(app).get('/api/content').set('x-demo-user', SOPHIE);
    const learner = await request(app).get('/api/content').set('x-demo-user', 'lrn-adwoa');
    const ga = (b: { cohorts: { id: string; assignments: { responses: unknown[] }[] }[] }) => b.cohorts.find((c) => c.id === 'coh-biz-a2')!.assignments[0].responses;
    expect(ga(tutor.body)).toHaveLength(2);
    expect(ga(learner.body)).toHaveLength(1);
  });

  it('lets only the group’s instructor take attendance', async () => {
    expect((await request(app).post('/api/community/cohorts/coh-biz-a2/sessions/cs-b2/attendance').set('x-demo-user', 'tut-aicha').send({ attended: [] })).status).toBe(403);
    const ok = await request(app).post('/api/community/cohorts/coh-biz-a2/sessions/cs-b2/attendance').set('x-demo-user', SOPHIE).send({ attended: ['lrn-ama', 'lrn-adwoa'] });
    expect(ok.status).toBe(200);
  });
});

describe('classmates', () => {
  it('lets learners message classmates they are connected to, never with contact details', async () => {
    const ok = await request(app).post('/api/threads').send({ participantId: 'lrn-grace', body: 'Bonjour Grace, on révise ensemble avant jeudi ?' });
    expect(ok.status).toBe(201);
    const blocked = await request(app).post('/api/threads').send({ participantId: 'lrn-grace', body: 'Call me on 024 123 4567' });
    expect(blocked.body.error.code).toBe('contact_details_blocked');
    const stranger = await request(app).post('/api/threads').send({ participantId: 'lrn-yaw', body: 'Bonjour !' });
    expect(stranger.status).toBe(403);
    await request(app).post('/api/community/follow').send({ learnerId: 'lrn-yaw', on: true });
    expect((await request(app).post('/api/threads').send({ participantId: 'lrn-yaw', body: 'Bonjour !' })).status).toBe(201);
  });
});

describe('leaderboard and rewards', () => {
  it('ranks learners from the reward ledger and hides learners who opted out', () => {
    const rows = leaderboard(seedContent());
    expect(rows[0].points).toBeGreaterThanOrEqual(rows[rows.length - 1].points);
    expect(rows.some((r) => r.learnerId === 'lrn-samuel')).toBe(false);
    expect(leaderboard(seedContent(), { viewerId: 'lrn-samuel' }).some((r) => r.learnerId === 'lrn-samuel')).toBe(true);
  });

  it('unlocks a reward token when a level is reached, and applies discounts at checkout', async () => {
    expect(levelFor(60).current.id).toBe('silver');
    const state = contentStore.get();
    contentStore.set({ ...state, rewards: [...state.rewards, { learnerId: 'lrn-ama', questId: 'lessons-2', week: '2026-10-12', points: 45, at: '2026-10-12T10:00:00Z' }] });
    const claim = await request(app).post('/api/me/quests/claim').send({ questId: 'streak-5' });
    const token = claim.body.state.tokens.find((t: { levelId: string }) => t.levelId === 'silver');
    expect(token).toBeTruthy();
    const pay = await request(app).post('/api/payments/initialize').send({ planId: 'plan-guided', method: 'card', provider: 'Visa', discountTokenId: token.id });
    expect(pay.body.payment.amountGhs).toBe(712.5);
    expect(pay.body.payment.discount.percent).toBe(5);
  });

  it('rotates a phrase of the day', () => {
    expect(phraseOfDay('2026-10-26').fr).not.toBe(phraseOfDay('2026-10-27').fr);
  });
});

describe('contact by default', () => {
  it('lets classmates at the same level text without following; others need a follow', async () => {
    // Kofi and Chinedu are both B1 and share no group: classmates by level.
    const classmate = await request(app).post('/api/threads').set('x-demo-user', 'lrn-kofi').send({ participantId: 'lrn-chinedu', body: 'Bonjour Chinedu, on révise ensemble ?' });
    expect(classmate.status).toBe(201);
    // Yaw is B2 and in no shared group: a follow is required first.
    const outsider = await request(app).post('/api/threads').set('x-demo-user', 'lrn-kofi').send({ participantId: 'lrn-yaw', body: 'Bonjour Yaw !' });
    expect(outsider.status).toBe(403);
  });
});

describe('group answers: shared only when the instructor allows it', () => {
  const answers = async (who: string) => ((await request(app).get('/api/content').set('x-demo-user', who)).body.cohorts as { id: string; assignments: { id: string; responses: { learnerId: string }[] }[] }[]).find((c) => c.id === 'coh-biz-a2')!.assignments.find((a) => a.id === 'ga-agenda')!.responses;

  it('keeps answers private by default, then shares them once a member has answered', async () => {
    expect((await answers('lrn-adwoa')).map((r) => r.learnerId)).toEqual(['lrn-adwoa']);
    expect((await request(app).post('/api/community/cohorts/coh-biz-a2/assignments/ga-agenda/sharing').set('x-demo-user', 'lrn-adwoa').send({ share: true })).status).toBe(403);
    expect((await request(app).post('/api/community/cohorts/coh-biz-a2/assignments/ga-agenda/sharing').set('x-demo-user', SOPHIE).send({ share: true })).status).toBe(200);
    expect((await answers('lrn-adwoa')).length).toBe(2);
    // Ama hasn't answered yet, so she still sees nothing of the others'.
    expect(await answers('lrn-ama')).toEqual([]);
  });
});

describe('message reports', () => {
  it('lets a participant report someone else’s message and the support team resolve it', async () => {
    expect((await request(app).post('/api/reports').send({ threadId: 'thr-1', messageId: 'm1', excerpt: '', authorId: 'lrn-ama', reason: 'spam' })).status).toBe(422);
    const made = await request(app).post('/api/reports').send({ threadId: 'thr-1', messageId: 'm2', excerpt: 'edited text', authorId: 'someone-else', reason: 'inappropriate' });
    expect(made.status).toBe(201);
    // The server records the real author and text, not what the client sent.
    expect(made.body.report).toMatchObject({ authorId: 'tut-sophie', reporterId: 'lrn-ama', status: 'open' });
    expect(made.body.report.excerpt).toContain('Bonjour Ama');
    expect((await request(app).post('/api/reports').set('x-demo-user', 'lrn-kofi').send({ threadId: 'thr-1', messageId: 'm2', excerpt: '', authorId: 'x', reason: 'spam' })).status).toBe(404);
    const id = made.body.report.id as string;
    expect((await request(app).post(`/api/admin/reports/${id}/resolve`).send({ outcome: 'actioned' })).status).toBe(403);
    const done = await request(app).post(`/api/admin/reports/${id}/resolve`).set('x-demo-user', 'adm-support').send({ outcome: 'actioned' });
    expect(done.body.report.status).toBe('actioned');
  });
});
