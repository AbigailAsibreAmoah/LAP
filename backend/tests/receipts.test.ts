import { buildReceipt, PAYMENTS, LEARNERS } from '@laporte/shared';
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

describe('payment receipts', () => {
  it('builds a receipt only for successful payments', () => {
    const ama = LEARNERS.find((l) => l.id === 'lrn-ama')!;
    const ok = PAYMENTS.find((p) => p.learnerId === 'lrn-ama' && p.status === 'success')!;
    const r = buildReceipt(ok, ama)!;
    expect(r.number).toBe(ok.reference);
    expect(r.totalGhs).toBe(ok.amountGhs);
    expect(r.billedTo.name).toBe('Ama Owusu');
    const failed = PAYMENTS.find((p) => p.status === 'failed')!;
    expect(buildReceipt(failed, ama)).toBeNull();
  });

  it('emails a receipt to its owner or an admin, never to someone else', async () => {
    const ok = PAYMENTS.find((p) => p.learnerId === 'lrn-ama' && p.status === 'success')!;
    const mine = await request(app).post(`/api/payments/${ok.reference}/receipt/email`);
    expect(mine.status).toBe(200);
    expect(mine.body).toMatchObject({ sent: true, to: 'ama@laporte.demo' });
    expect((await request(app).post(`/api/payments/${ok.reference}/receipt/email`).set('x-demo-user', 'lrn-kofi')).status).toBe(404);
    expect((await request(app).post(`/api/payments/${ok.reference}/receipt/email`).set('x-demo-user', 'adm-01')).status).toBe(200);
    const failed = PAYMENTS.find((p) => p.status === 'failed')!;
    expect((await request(app).post(`/api/payments/${failed.reference}/receipt/email`).set('x-demo-user', 'adm-01')).status).toBe(409);
  });

  it('respects the learner’s choice about automatic receipt emails', async () => {
    const pay = async () => {
      const init = await request(app).post('/api/payments/initialize').send({ planId: 'plan-essentials', method: 'mobile-money', provider: 'MTN MoMo' });
      await request(app).post(`/api/payments/${init.body.payment.reference}/verify`);
      const notes = (await request(app).get('/api/notifications')).body as { body: { en: string } }[];
      return notes.filter((n) => n.body.en.includes(init.body.payment.reference)).length;
    };
    expect(await pay()).toBe(1); // on by default: the receipt is emailed
    const off = await request(app).put('/api/me/receipt-emails').send({ receiptEmails: false });
    expect(off.body.receiptEmails).toBe(false);
    expect(await pay()).toBe(0); // turned off: no email (the receipt is still in the app)
  });
});
