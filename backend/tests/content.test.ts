import {
  cancellationOutcome,
  COURSES,
  findContactDetails,
  OPENING_VIDEO_MAX_SECONDS,
  OPENING_VIDEO_MIN_SECONDS,
  seedContent,
  visibleContent,
} from '@laporte/shared';
import request from 'supertest';
import { right, takePlacement } from './placementHelper';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { bookingRepository } from '../src/repositories/bookingRepository';
import { contentStore } from '../src/repositories/contentStore';
import { resetDemoStore } from '../src/repositories/demoStore';

const app = createApp();
beforeEach(() => {
  resetDemoStore();
  contentStore.reset();
});

const ADMIN = 'adm-support';
const SOPHIE = 'tut-sophie'; // lead tutor of Business French
const AICHA = 'tut-aicha'; // not authorised on Business French

/** A minimal MP4 (ftyp + moov/mvhd) whose header declares `seconds` of media. */
function fakeMp4(seconds: number) {
  const ftyp = Buffer.from([0, 0, 0, 16, ...Buffer.from('ftypisom'), 0, 0, 2, 0]);
  const mvhd = Buffer.alloc(28);
  mvhd.writeUInt32BE(28, 0);
  mvhd.write('mvhd', 4, 'latin1');
  mvhd.writeUInt32BE(1000, 20); // timescale
  mvhd.writeUInt32BE(seconds * 1000, 24); // duration
  const moovHead = Buffer.alloc(8);
  moovHead.writeUInt32BE(8 + mvhd.length, 0);
  moovHead.write('moov', 4, 'latin1');
  return Buffer.concat([ftyp, moovHead, mvhd]);
}

const uploadVideo = (seconds: number, claimed = seconds, as = ADMIN) =>
  request(app)
    .post('/api/content/media')
    .set('x-demo-user', as)
    .field('title', `Clip ${seconds}s`)
    .field('durationSec', String(claimed))
    .attach('file', fakeMp4(seconds), { filename: 'clip.mp4', contentType: 'video/mp4' });

describe('seed library', () => {
  it('opens every lesson with a video of about 5 minutes (4–6 min)', () => {
    const lessons = COURSES.flatMap((c) => c.modules.flatMap((m) => m.lessons));
    for (const l of lessons) {
      expect(l.videoSec, `${l.id} needs an opening video`).toBeTypeOf('number');
      expect(l.videoSec!).toBeGreaterThanOrEqual(OPENING_VIDEO_MIN_SECONDS);
      expect(l.videoSec!).toBeLessThanOrEqual(OPENING_VIDEO_MAX_SECONDS);
    }
    const state = seedContent();
    for (const l of state.lessons) expect(l.blocks[0].type, `${l.id} must start with a video`).toBe('video');
  });

  it('shows learners published lessons only (progressive release)', async () => {
    const res = await request(app).get('/api/content');
    expect(res.status).toBe(200);
    expect(res.body.lessons.length).toBeGreaterThan(0);
    expect(res.body.lessons.every((l: { status: string }) => l.status === 'published')).toBe(true);
    const staff = await request(app).get('/api/content').set('x-demo-user', ADMIN);
    expect(staff.body.lessons.length).toBeGreaterThan(res.body.lessons.length);
  });

  it('never gives a learner another learner’s practice', () => {
    const v = visibleContent(seedContent(), { id: 'lrn-ama', role: 'learner' });
    expect(v.assignments.every((a) => a.learnerId === 'lrn-ama')).toBe(true);
  });
});

describe('authoring permissions and workflow', () => {
  const draft = { courseId: 'crs-business', moduleIndex: 0, title: 'Écrire un courriel professionnel', level: 'A2', kind: 'reading', minutes: 20, objective: { en: 'Write a clear email.', fr: 'Écrire un courriel clair.' } };

  it('lets an authorised instructor create a draft from the lesson template', async () => {
    const res = await request(app).post('/api/content/lessons').set('x-demo-user', SOPHIE).send(draft);
    expect(res.status).toBe(201);
    expect(res.body.lesson.status).toBe('draft');
    expect(res.body.lesson.blocks[0].type).toBe('video');
  });

  it('refuses instructors who are not authorised on the course, and learners', async () => {
    expect((await request(app).post('/api/content/lessons').set('x-demo-user', AICHA).send(draft)).status).toBe(403);
    expect((await request(app).post('/api/content/lessons').send(draft)).status).toBe(403);
  });

  it('lets an admin grant editing rights', async () => {
    await request(app).put('/api/content/courses/crs-business/editors').set('x-demo-user', ADMIN).send({ tutorIds: [AICHA] });
    expect((await request(app).post('/api/content/lessons').set('x-demo-user', AICHA).send(draft)).status).toBe(201);
  });

  it('only lets admins publish, then learners can see the lesson', async () => {
    expect((await request(app).post('/api/content/lessons/les-b6/publish').set('x-demo-user', SOPHIE).send({})).status).toBe(403);
    const pub = await request(app).post('/api/content/lessons/les-b6/publish').set('x-demo-user', ADMIN).send({});
    expect(pub.status).toBe(200);
    const learner = await request(app).get('/api/content');
    expect(learner.body.lessons.some((l: { id: string }) => l.id === 'les-b6')).toBe(true);
  });

  it('blocks submitting a lesson without a ~5-minute opening video', async () => {
    const created = await request(app).post('/api/content/lessons').set('x-demo-user', SOPHIE).send(draft);
    const res = await request(app).post(`/api/content/lessons/${created.body.lesson.id}/submit`).set('x-demo-user', SOPHIE).send({});
    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/opening video/i);
  });

  it('rejects a 3-minute clip as the opening video', async () => {
    const clip = await uploadVideo(180);
    expect(clip.status).toBe(201);
    const lesson = (await request(app).get('/api/content').set('x-demo-user', ADMIN)).body.lessons.find((l: { id: string }) => l.id === 'les-b6');
    const blocks = [{ ...lesson.blocks[0], assetId: clip.body.asset.id }, ...lesson.blocks.slice(1)];
    await request(app).patch('/api/content/lessons/les-b6').set('x-demo-user', ADMIN).send({ patch: { blocks } });
    const res = await request(app).post('/api/content/lessons/les-b6/publish').set('x-demo-user', ADMIN).send({});
    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/about 5 minutes/);
  });

  it('requires a note when sending a lesson back to its author', async () => {
    expect((await request(app).post('/api/content/lessons/les-b6/request-changes').set('x-demo-user', ADMIN).send({})).status).toBe(422);
    const res = await request(app).post('/api/content/lessons/les-b6/request-changes').set('x-demo-user', ADMIN).send({ note: 'Add a listening activity.' });
    expect(res.body.lesson.status).toBe('draft');
    expect(res.body.lesson.reviewNote).toBe('Add a listening activity.');
  });
});

describe('media uploads', () => {
  it('measures MP4 duration on the server and rejects videos over 6 minutes even if the browser claims otherwise', async () => {
    const res = await uploadVideo(7 * 60, 60);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('video_too_long');
  });

  it('stores accepted uploads and streams them back with range support', async () => {
    const res = await uploadVideo(300);
    expect(res.status).toBe(201);
    expect(res.body.measuredOnServer).toBe(true);
    expect(res.body.asset.durationSec).toBe(300);
    const file = await request(app).get(res.body.asset.url).set('Range', 'bytes=0-7');
    expect(file.status).toBe(206);
  });

  it('refuses uploads from learners', async () => {
    expect((await uploadVideo(300, 300, 'lrn-ama')).status).toBe(403);
  });
});

describe('booking policy', () => {
  it('refunds the credit 24 h or more ahead, keeps it inside 24 h, and flags emergencies for review', () => {
    const now = '2026-10-26T09:00:00Z';
    expect(cancellationOutcome({ start: '2026-10-27T10:00:00Z' }, now).refund).toBe(true);
    expect(cancellationOutcome({ start: '2026-10-26T15:00:00Z' }, now)).toEqual({ kind: 'late', refund: false });
    expect(cancellationOutcome({ start: '2026-10-26T15:00:00Z' }, now, true).kind).toBe('late-emergency');
  });

  it('requires a reason to cancel', async () => {
    expect((await request(app).post('/api/bookings/bk-1001/cancel').send({})).status).toBe(400);
  });

  it('lets an admin restore the credit after an emergency late cancellation', async () => {
    bookingRepository.insert({ id: 'bk-late', learnerId: 'lrn-ama', tutorId: 'tut-sophie', start: '2026-10-26T15:00:00Z', durationMin: 45, kind: 'private', topic: 'Test', status: 'confirmed', creditCost: 1, meeting: { provider: 'google-meet', status: 'simulated', joinUrl: null } });
    const cancel = await request(app).post('/api/bookings/bk-late/cancel').send({ reason: 'Family emergency', emergency: true });
    expect(cancel.body.booking.cancellation).toMatchObject({ late: true, creditRefunded: false, review: 'pending' });
    expect(cancel.body.creditsRemaining).toBe(3);
    const review = await request(app).post('/api/admin/bookings/bk-late/exception').set('x-demo-user', ADMIN).send({ decision: 'approved', note: 'Documented emergency' });
    expect(review.body.creditsRemaining).toBe(4);
  });

  it('blocks self-service rescheduling inside 24 hours', async () => {
    bookingRepository.insert({ id: 'bk-soon', learnerId: 'lrn-ama', tutorId: 'tut-sophie', start: '2026-10-26T15:00:00Z', durationMin: 45, kind: 'private', topic: 'Test', status: 'confirmed', creditCost: 1, meeting: { provider: 'google-meet', status: 'simulated', joinUrl: null } });
    const res = await request(app).post('/api/bookings/bk-soon/reschedule').send({ start: '2026-10-28T10:00:00Z' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('policy_window');
  });
});

describe('messaging safety', () => {
  it.each(['Call me on +233 24 123 4567', 'my email is ama.owusu@gmail.com', 'add me on whatsapp wa.me/233241234567', 'ama dot owusu at gmail dot com', 'my insta is @ama_speaks'])('blocks contact details: %s', async (body) => {
    const res = await request(app).post('/api/threads/thr-1/messages').send({ body });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('contact_details_blocked');
  });

  it('allows ordinary messages, dates and prices', async () => {
    expect(findContactDetails('Can we meet on 2026-10-29 at 18:00? The quote was 12 000 000 FCFA.')).toEqual([]);
    expect(findContactDetails('I received the WhatsApp reminder, merci !')).toEqual([]);
    expect((await request(app).post('/api/threads/thr-1/messages').send({ body: 'Merci Sophie, à mardi !' })).status).toBe(201);
  });
});

describe('placement and rewards', () => {
  it('scores the placement on the server and sets the provisional level', async () => {
    const res = await takePlacement(app, right);
    expect(res.status).toBe(201);
    expect(res.body.result.level).toBe('C2');
    // Courses belong to one level: the plan only recommends courses at the placement level.
    expect(res.body.result.plan.courseIds).toEqual(['crs-mastery', 'crs-exams-c2']);
    expect(res.body.learner.level).toBe('C2');
  });

  it('grants quest points once, only when the quest is really complete', async () => {
    const ok = await request(app).post('/api/me/quests/claim').send({ questId: 'streak-5' });
    expect(ok.status).toBe(200);
    expect(ok.body.points).toBe(5);
    expect((await request(app).post('/api/me/quests/claim').send({ questId: 'streak-5' })).status).toBe(409);
    const notYet = await request(app).post('/api/me/quests/claim').send({ questId: 'quiz-ace-3' });
    expect(notYet.body.error.code).toBe('not_complete');
  });
});
