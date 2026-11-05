import { cafeTextIssue, linksIn } from '@laporte/shared';
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
const cafe = (op: string, body: object, user = 'lrn-ama') => request(app).post(`/api/cafe/${op}`).set('x-demo-user', user).send(body);

describe('café text rules', () => {
  it('allows normal links but blocks contact details, messaging links and abuse', () => {
    expect(cafeTextIssue('Super article : https://www.rfi.fr/fr/afrique/ 🌍')).toBeNull();
    expect(linksIn('Voir https://fr.wikipedia.org/wiki/Dakar, et https://youtu.be/abc.')).toEqual(['https://fr.wikipedia.org/wiki/Dakar', 'https://youtu.be/abc']);
    expect(cafeTextIssue('Écris-moi sur https://wa.me/233240000000')).toMatch(/messaging/);
    expect(cafeTextIssue('Mon numéro : 024 000 0000')).toMatch(/Phone/);
    expect(cafeTextIssue('mail me: ama@example.com')).toMatch(/Phone numbers, emails/);
    expect(cafeTextIssue('🔥'.repeat(31))).toMatch(/emoji/);
  });
});

describe('café', () => {
  it('posts, comments, reacts (toggle), saves, and counts French posts towards the quest', async () => {
    const posted = await cafe('post', { spaceId: 'sp-travel', body: 'Ce week-end, je suis allée au marché de Makola avec ma sœur et nous avons acheté des tissus et des mangues délicieuses 🥭', french: true });
    expect(posted.status).toBe(200);
    const postId = posted.body.post.id as string;
    expect((await cafe('comment', { postId, body: 'Super ! :) Quel tissu ?' }, 'lrn-grace')).status).toBe(200);
    const on = await cafe('react', { targetId: postId, emoji: '🇫🇷' }, 'lrn-grace');
    expect(on.body.on).toBe(true);
    expect((await cafe('react', { targetId: postId, emoji: '🇫🇷' }, 'lrn-grace')).body.on).toBe(false);
    expect((await cafe('react', { targetId: postId, emoji: 'abc' })).status).toBe(422);
    expect((await cafe('save', { postId, on: true })).body.state.cafe.saves).toHaveLength(1);
    const quests = (await request(app).get('/api/content')).body;
    expect(quests.cafe.posts.some((p: { id: string }) => p.id === postId)).toBe(true);
  });

  it('keeps study group feeds for members, caps groups at 8, and lets only staff moderate', async () => {
    const g = await cafe('createGroup', { name: 'Les Curieux', level: 'A2', goal: 'Conversation', usualTime: 'Mondays 18:00 GMT' });
    const groupId = g.body.group.id as string;
    expect((await cafe('post', { spaceId: groupId, body: 'Bonjour le groupe !' }, 'lrn-kofi')).status).toBe(403);
    expect((await cafe('post', { spaceId: groupId, body: 'Bonjour le groupe !' })).status).toBe(200);
    const seen = (await request(app).get('/api/content').set('x-demo-user', 'lrn-kofi')).body.cafe.posts;
    expect(seen.some((p: { spaceId: string }) => p.spaceId === groupId)).toBe(false);
    for (const id of ['lrn-kofi', 'lrn-efua', 'lrn-yaw', 'lrn-adwoa', 'lrn-chinedu', 'lrn-grace', 'lrn-samuel']) await cafe('joinGroup', { groupId, on: true }, id);
    const full = await cafe('joinGroup', { groupId, on: true }, 'lrn-nana');
    expect(full.status).toBe(409);
    expect((await cafe('moderate', { postId: 'cp-3', action: 'hide' })).status).toBe(403);
    expect((await cafe('moderate', { postId: 'cp-3', action: 'hide' }, 'tut-sophie')).status).toBe(200);
    const learnerView = (await request(app).get('/api/content')).body.cafe.posts;
    expect(learnerView.some((p: { id: string }) => p.id === 'cp-3')).toBe(false);
  });

  it('sends reports to the review queue and only lets tutors post challenges or verify answers', async () => {
    expect((await cafe('post', { spaceId: 'sp-grammar', body: 'Défi !', kind: 'challenge' })).status).toBe(403);
    expect((await cafe('acceptAnswer', { postId: 'cp-2', commentId: 'cc-1' })).status).toBe(403);
    expect((await cafe('acceptAnswer', { postId: 'cp-2', commentId: 'cc-1' }, 'tut-sophie')).status).toBe(200);
    const rep = await cafe('report', { postId: 'cp-3', reason: 'spam' });
    expect(rep.status).toBe(200);
    const admin = (await request(app).get('/api/content').set('x-demo-user', 'adm-support')).body;
    expect(admin.reports.some((r: { messageId: string }) => r.messageId === 'cp-3')).toBe(true);
    expect((await cafe('nope', {})).status).toBe(404);
  });
});
