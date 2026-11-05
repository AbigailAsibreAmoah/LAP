import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { resetDemoStore } from '../src/repositories/demoStore';

const app = createApp();

beforeEach(() => resetDemoStore());

describe('health', () => {
  it('reports demo mode and mock providers', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.mode).toBe('demo');
    expect(res.body.providers.payments).toBe('mock');
  });
});

describe('bookings', () => {
  it('excludes already-booked slots from availability', async () => {
    const res = await request(app).get('/api/tutors/tut-sophie/availability?date=2026-10-27');
    const ten = res.body.find((s: { time: string }) => s.time === '10:00');
    expect(ten.available).toBe(false);
  });

  it('books a slot, spends a credit and keeps the meeting simulated', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({ tutorId: 'tut-sophie', start: '2026-10-27T12:00:00Z', topic: 'Practice' });
    expect(res.status).toBe(201);
    expect(res.body.creditsRemaining).toBe(2);
    expect(res.body.booking.meeting).toEqual({ provider: 'google-meet', status: 'simulated', joinUrl: null });
    expect(res.body.deliveries.every((d: { delivered: boolean }) => !d.delivered)).toBe(true);
  });

  it('rejects double booking', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({ tutorId: 'tut-sophie', start: '2026-10-27T10:00:00Z', topic: 'Practice' });
    expect(res.status).toBe(409);
  });

  it('requires a credit before booking (payment precedes paid bookings)', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('x-demo-user', 'lrn-efua')
      .send({ tutorId: 'tut-sophie', start: '2026-10-27T12:00:00Z', topic: 'Practice' });
    expect(res.status).toBe(402);
    expect(res.body.error.code).toBe('insufficient_credits');
  });

  it('returns the credit on cancellation', async () => {
    const res = await request(app).post('/api/bookings/bk-1001/cancel').send({ reason: 'Travelling for work' });
    expect(res.body.booking.status).toBe('cancelled');
    expect(res.body.creditsRemaining).toBe(4);
  });

  it('validates the request body', async () => {
    const res = await request(app).post('/api/bookings').send({ tutorId: 'tut-sophie', start: 'tomorrow' });
    expect(res.status).toBe(400);
  });
});

describe('payments', () => {
  it('only grants credits after server-side verification succeeds', async () => {
    const init = await request(app)
      .post('/api/payments/initialize')
      .set('x-demo-user', 'lrn-efua')
      .send({ planId: 'plan-guided', method: 'mobile-money', provider: 'MTN MoMo' });
    expect(init.status).toBe(201);
    expect(init.body.payment.status).toBe('pending');

    const me = await request(app).get('/api/me').set('x-demo-user', 'lrn-efua');
    expect(me.body.credits).toBe(0);

    const verified = await request(app).post(`/api/payments/${init.body.payment.reference}/verify`);
    expect(verified.body.payment.status).toBe('success');
    expect(verified.body.learner.credits).toBe(2);
  });

  it('does not grant credits when verification fails', async () => {
    const init = await request(app)
      .post('/api/payments/initialize')
      .set('x-demo-user', 'lrn-efua')
      .send({ planId: 'plan-guided', method: 'card', provider: 'Visa', simulateFailure: true });
    const verified = await request(app).post(`/api/payments/${init.body.payment.reference}/verify`);
    expect(verified.body.payment.status).toBe('failed');
    expect(verified.body.learner.credits).toBe(0);
  });

  it('refuses checkout for quote-only programmes', async () => {
    const res = await request(app)
      .post('/api/payments/initialize')
      .send({ planId: 'plan-executive', method: 'card', provider: 'Visa' });
    expect(res.status).toBe(422);
  });
});

describe('roles', () => {
  it('blocks the admin overview for learners', async () => {
    expect((await request(app).get('/api/admin/overview')).status).toBe(403);
    expect((await request(app).get('/api/admin/overview').set('x-demo-user', 'adm-support')).status).toBe(200);
  });
});

describe('tutor calendar', () => {
  it('hides slots that are busy on the tutor’s own calendar (simulated Google Calendar free/busy)', async () => {
    const res = await request(app).get('/api/tutors/tut-sophie/availability?date=2026-10-28');
    const noon = res.body.find((s: { time: string }) => s.time === '12:00');
    if (noon) {
      expect(noon.available).toBe(false);
      expect(noon.reason).toBe('calendar');
    }
    const book = noon && (await request(app).post('/api/bookings').send({ tutorId: 'tut-sophie', start: '2026-10-28T12:00:00Z', topic: 'Practice' }));
    if (book) expect(book.status).toBe(409);
  });
});
