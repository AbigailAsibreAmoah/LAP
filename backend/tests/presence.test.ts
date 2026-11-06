import { applyPresence, heartbeat, nowIso, resolvePresence, type Booking, type PresenceRecord } from '@laporte/shared';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { resetDemoStore, store } from '../src/repositories/demoStore';

const app = createApp();
const SOPHIE = 'tut-sophie';
const NOW = '2026-11-06T10:00:00.000Z';
const min = (n: number) => new Date(Date.parse(NOW) + n * 60_000).toISOString();
const ids = (() => { let n = 0; return (p: string) => `${p}-${++n}`; })();

beforeEach(() => resetDemoStore());

describe('presence rules', () => {
  it('is worked out from activity when the tutor has not chosen a status', () => {
    expect(resolvePresence(undefined, SOPHIE, NOW).status).toBe('offline');
    const active = heartbeat(undefined, SOPHIE, min(-1), true);
    expect(resolvePresence(active, SOPHIE, NOW)).toMatchObject({ status: 'online', source: 'auto' });
    // app open, but no activity for over 10 minutes → on break (set by the system)
    const idle: PresenceRecord = { tutorId: SOPHIE, lastSeenAt: min(-1), lastActiveAt: min(-12) };
    expect(resolvePresence(idle, SOPHIE, NOW)).toMatchObject({ status: 'on-break', source: 'auto' });
    // no heartbeat for more than 3 minutes → offline
    expect(resolvePresence({ tutorId: SOPHIE, lastSeenAt: min(-4), lastActiveAt: min(-4) }, SOPHIE, NOW).status).toBe('offline');
  });

  it('shows "in a session" during a confirmed booking', () => {
    const b = { id: 'b', tutorId: SOPHIE, learnerId: 'lrn-ama', start: min(-10), durationMin: 45, status: 'confirmed' } as Booking;
    expect(resolvePresence(heartbeat(undefined, SOPHIE, min(-1), true), SOPHIE, NOW, [b])).toMatchObject({ status: 'online', inSession: true });
  });

  it('ends a timed break by itself', () => {
    const rec = applyPresence(undefined, SOPHIE, { kind: 'break', minutes: 15 }, NOW, ids);
    expect(resolvePresence(rec, SOPHIE, min(5))).toMatchObject({ status: 'on-break', source: 'manual', until: min(15) });
    expect(resolvePresence({ ...rec, lastSeenAt: min(16), lastActiveAt: min(16) }, SOPHIE, min(16)).status).toBe('online');
  });

  it('starts and ends scheduled time off on its dates, and the tutor can end it early', () => {
    const rec = applyPresence(undefined, SOPHIE, { kind: 'out-of-office', from: min(60 * 24), until: min(60 * 24 * 3), reason: 'holiday' }, NOW, ids);
    expect(resolvePresence({ ...rec, lastSeenAt: NOW, lastActiveAt: NOW }, SOPHIE, NOW).status).toBe('online'); // not yet
    expect(resolvePresence(rec, SOPHIE, min(60 * 25))).toMatchObject({ status: 'out-of-office', source: 'auto', reason: 'holiday', until: min(60 * 24 * 3) });
    expect(resolvePresence(rec, SOPHIE, min(60 * 24 * 3 + 1)).status).toBe('offline'); // over
    const back = applyPresence(rec, SOPHIE, { kind: 'online' }, min(60 * 25), ids);
    expect(resolvePresence(back, SOPHIE, min(60 * 25)).status).toBe('online');
  });

  it('rejects bad time off', () => {
    expect(() => applyPresence(undefined, SOPHIE, { kind: 'out-of-office', from: min(100), until: min(50), reason: 'holiday' }, NOW, ids)).toThrow(/after/);
    expect(() => applyPresence(undefined, SOPHIE, { kind: 'out-of-office', from: min(0), until: min(60 * 24 * 90), reason: 'holiday' }, NOW, ids)).toThrow(/60 days/);
    expect(() => applyPresence(undefined, SOPHIE, { kind: 'break', minutes: 45 }, NOW, ids)).toThrow(/15, 30 or 60/);
  });
});

describe('presence API', () => {
  const tutor = (r: request.Test) => r.set('x-demo-user', SOPHIE);

  it('lets a tutor set a status that everyone sees', async () => {
    const set = await tutor(request(app).put('/api/me/presence')).send({ kind: 'break', minutes: 30 });
    expect(set.status).toBe(200);
    expect(set.body.resolved).toMatchObject({ status: 'on-break', source: 'manual' });
    const all = await request(app).get('/api/presence');
    expect(all.body.find((p: { tutorId: string }) => p.tutorId === SOPHIE).status).toBe('on-break');
    expect(all.body).toHaveLength(4);
  });

  it('only lets tutors change their own status', async () => {
    expect((await request(app).put('/api/me/presence').send({ kind: 'offline' })).status).toBe(403); // learner
    expect((await tutor(request(app).put('/api/me/presence')).send({ kind: 'out-of-office', from: 'soon', until: 'later', reason: 'holiday' })).status).toBe(400);
    expect((await tutor(request(app).put('/api/me/presence')).send({ kind: 'out-of-office', from: nowIso(), until: new Date(Date.parse(nowIso()) + 86_400_000).toISOString(), reason: 'call me on 024…' })).status).toBe(400);
  });

  it('records heartbeats', async () => {
    store.presence[SOPHIE] = { tutorId: SOPHIE };
    const beat = await tutor(request(app).post('/api/me/presence/heartbeat')).send({ active: true });
    expect(beat.body).toMatchObject({ status: 'online', source: 'auto' });
  });

  it('blocks bookings while a tutor is out of office', async () => {
    // Aïcha is out of office in the demo seed (examining): her slots close for those days.
    const days = [1, 2, 3].map((d) => new Date(Date.parse(nowIso()) + d * 86_400_000).toISOString().slice(0, 10));
    const slots = (await Promise.all(days.map((d) => request(app).get(`/api/tutors/tut-aicha/availability?date=${d}`)))).flatMap((r) => r.body.slots ?? r.body);
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.filter((s: { available: boolean }) => s.available)).toEqual([]); // nothing bookable (already-booked slots stay "booked")
    expect(slots.some((s: { reason?: string }) => s.reason === 'out-of-office')).toBe(true);
    const free = slots.find((s: { reason?: string }) => s.reason === 'out-of-office');
    const book = await request(app).post('/api/bookings').send({ tutorId: 'tut-aicha', start: free.start, topic: 'Compréhension orale' });
    expect(book.status).toBe(409);
    expect(book.body.error.code).toBe('tutor_out_of_office');
  });
});
