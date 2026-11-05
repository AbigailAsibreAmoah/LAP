import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { contentStore } from '../src/repositories/contentStore';
import { resetDemoStore } from '../src/repositories/demoStore';
import { right, takePlacement } from './placementHelper';

const app = createApp();
beforeEach(() => {
  resetDemoStore();
  contentStore.reset();
});

describe('learner accounts', () => {
  it('signs up a new learner at A1, separate from Ama, and logs them back in by email', async () => {
    const made = await request(app).post('/api/auth/register').send({ name: 'Kwesi Appiah', email: 'Kwesi@Example.com', areaId: 'business' });
    expect(made.status).toBe(201);
    expect(made.body).toMatchObject({ name: 'Kwesi Appiah', firstName: 'Kwesi', email: 'kwesi@example.com', level: 'A1', credits: 0 });
    const id = made.body.id as string;
    expect(id).not.toBe('lrn-ama');
    expect((await request(app).post('/api/auth/register').send({ name: 'Other', email: 'kwesi@example.com', areaId: 'business' })).status).toBe(409);
    expect((await request(app).post('/api/auth/login').send({ email: 'KWESI@example.com' })).body.id).toBe(id);
    expect((await request(app).post('/api/auth/login').send({ email: 'nobody@example.com' })).status).toBe(404);
    expect((await request(app).post('/api/auth/login').send({ email: 'ama@laporte.demo' })).body.id).toBe('lrn-ama');

    // Their own placement and data; Ama's are untouched.
    const placed = await takePlacement(app, right, {}, id);
    expect(placed.body.learner.id).toBe(id);
    expect(placed.body.learner.level).toBe('C2');
    expect((await request(app).get('/api/me').set('x-demo-user', 'lrn-ama')).body.level).toBe('A2');
    expect((await request(app).get('/api/me/vocabulary').set('x-demo-user', id)).body).toEqual([]);
    expect((await request(app).get('/api/me/vocabulary')).body.length).toBeGreaterThan(0);
  });
});
