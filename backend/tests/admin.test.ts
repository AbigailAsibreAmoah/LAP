import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { resetDemoStore } from '../src/repositories/demoStore';
import { contentStore } from '../src/repositories/contentStore';

const app = createApp();
const ADMIN = 'adm-01';
const TUTOR = 'tut-sophie';

beforeEach(() => {
  resetDemoStore();
  contentStore.reset();
});

describe('admin learner actions', () => {
  it('gives and removes session credits, admins only', async () => {
    const before = (await request(app).get('/api/me')).body.credits ?? 0;
    const add = await request(app).post('/api/admin/learners/lrn-ama/credits').set('x-demo-user', ADMIN).send({ delta: 2, reason: 'Session cancelled by tutor' });
    expect(add.status).toBe(200);
    expect(add.body.learner.credits).toBe(before + 2);
    // Learners and tutors cannot do this.
    expect((await request(app).post('/api/admin/learners/lrn-ama/credits').send({ delta: 5, reason: 'free credits' })).status).toBe(403);
    expect((await request(app).post('/api/admin/learners/lrn-ama/credits').set('x-demo-user', TUTOR).send({ delta: 5, reason: 'x' })).status).toBe(403);
    // Credits never go below zero, and the change must be within limits.
    expect((await request(app).post('/api/admin/learners/lrn-ama/credits').set('x-demo-user', ADMIN).send({ delta: -20, reason: 'Correction' })).body.learner.credits).toBe(0);
    expect((await request(app).post('/api/admin/learners/lrn-ama/credits').set('x-demo-user', ADMIN).send({ delta: 500, reason: 'too many' })).status).toBe(400);
  });

  it('opens the next level for a learner', async () => {
    const r = await request(app).post('/api/admin/learners/lrn-ama/unlock').set('x-demo-user', ADMIN).send({ level: 'B1' });
    expect(r.status).toBe(200);
    expect(r.body.learner.unlockedLevel).toBe('B1');
    expect((await request(app).post('/api/admin/learners/nobody/unlock').set('x-demo-user', ADMIN).send({ level: 'B1' })).status).toBe(404);
  });
});

describe('staff messages', () => {
  it('lets a tutor send feedback to a learner, but not to other staff, and blocks contact details', async () => {
    const r = await request(app).post('/api/staff/threads').set('x-demo-user', TUTOR).send({ participantId: 'lrn-adwoa', subject: 'Feedback', body: 'Très bon travail !' });
    expect(r.status).toBe(201);
    expect(r.body.participantIds).toEqual(expect.arrayContaining([TUTOR, 'lrn-adwoa']));
    expect(r.body.messages.at(-1).body).toBe('Très bon travail !');
    expect((await request(app).post('/api/staff/threads').set('x-demo-user', TUTOR).send({ participantId: 'tut-other', subject: 'Hi', body: 'hello' })).status).toBe(403);
    expect((await request(app).post('/api/staff/threads').send({ participantId: 'lrn-adwoa', subject: 'Hi', body: 'hello' })).status).toBe(403);
    expect((await request(app).post('/api/staff/threads').set('x-demo-user', TUTOR).send({ participantId: 'lrn-adwoa', subject: 'Hi', body: 'Call me on 024 123 4567' })).status).toBe(422);
  });
});
