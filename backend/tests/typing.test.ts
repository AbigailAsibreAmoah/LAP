import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { resetDemoStore, store } from '../src/repositories/demoStore';

const app = createApp();
beforeEach(() => resetDemoStore());

describe('typing indicator', () => {
  const thread = () => store.threads.find((t) => t.participantIds.includes('lrn-ama') && t.participantIds.includes('tut-sophie'))!;

  it('shows the other person as typing, never yourself, and clears when they send', async () => {
    const th = thread();
    expect((await request(app).post(`/api/threads/${th.id}/typing`).set('x-demo-user', 'tut-sophie').send({ typing: true })).status).toBe(200);
    const ama = await request(app).get('/api/threads/live'); // learner Ama by default
    expect(ama.body.typing[th.id]).toEqual(['tut-sophie']);
    expect(ama.body.threads.some((t: { id: string }) => t.id === th.id)).toBe(true);
    const sophie = await request(app).get('/api/threads/live').set('x-demo-user', 'tut-sophie');
    expect(sophie.body.typing[th.id]).toBeUndefined();
    await request(app).post(`/api/threads/${th.id}/messages`).set('x-demo-user', 'tut-sophie').send({ body: 'Bonjour Ama, c’est parfait !' });
    const after = await request(app).get('/api/threads/live');
    expect(after.body.typing[th.id]).toBeUndefined();
    expect(after.body.threads.find((t: { id: string }) => t.id === th.id).messages.at(-1).body).toBe('Bonjour Ama, c’est parfait !');
  });

  it('expires on its own and can be switched off', async () => {
    const th = thread();
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      await request(app).post(`/api/threads/${th.id}/typing`).set('x-demo-user', 'tut-sophie').send({ typing: true });
      vi.setSystemTime(Date.now() + 7_000);
      expect((await request(app).get('/api/threads/live')).body.typing[th.id]).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
    await request(app).post(`/api/threads/${th.id}/typing`).set('x-demo-user', 'tut-sophie').send({ typing: true });
    await request(app).post(`/api/threads/${th.id}/typing`).set('x-demo-user', 'tut-sophie').send({ typing: false });
    expect((await request(app).get('/api/threads/live')).body.typing[th.id]).toBeUndefined();
  });

  it('only lets participants signal typing', async () => {
    const th = thread();
    expect((await request(app).post(`/api/threads/${th.id}/typing`).set('x-demo-user', 'tut-thomas').send({ typing: true })).status).toBe(404);
  });
});
