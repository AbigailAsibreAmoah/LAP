import { z } from 'zod';

const isoStart = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00Z$/, 'Expected an ISO start time such as 2026-10-27T10:00:00Z');

export const createBookingSchema = z.object({
  tutorId: z.string().min(1),
  start: isoStart,
  topic: z.string().trim().min(2).max(140),
  purpose: z.enum(['conversation', 'course-help', 'catch-up']).optional(),
  missedSessionId: z.string().max(40).optional(),
});

export const rescheduleBookingSchema = z.object({ start: isoStart });

export const availabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD'),
});

export const initializePaymentSchema = z.object({
  planId: z.string().min(1),
  method: z.enum(['mobile-money', 'card']),
  provider: z.string().trim().min(2).max(40),
  simulateFailure: z.boolean().optional(),
  /** A reward discount token to apply. */
  discountTokenId: z.string().max(60).optional(),
});

export const postMessageSchema = z.object({ body: z.string().trim().min(1).max(2000) });

export const addVocabularySchema = z.object({
  fr: z.string().trim().min(1).max(200),
  en: z.string().trim().min(1).max(200),
  example: z.string().trim().max(400).default(''),
  source: z.string().trim().max(120).default('Manual'),
});

/* ---------- Booking policy ---------- */

export const cancelBookingSchema = z.object({
  reason: z.string().trim().min(3, 'Please give a short reason.').max(500),
  emergency: z.boolean().optional(),
});

export const reviewCancellationSchema = z.object({
  decision: z.enum(['approved', 'declined']),
  note: z.string().trim().min(2).max(500),
});

/* ---------- Content library ---------- */

const localized = z.object({ en: z.string().max(4000), fr: z.string().max(4000) });
const level = z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
const lessonKind = z.enum(['video', 'reading', 'quiz', 'speaking', 'assignment', 'live']);
const question = z.object({
  id: z.string().min(1),
  prompt: z.string().max(500),
  options: z.array(z.string().max(300)).min(2).max(6),
  answer: z.number().int().min(0),
  explanation: localized,
});
const phrase = z.object({ fr: z.string().max(300), en: z.string().max(300) });
const blockId = { id: z.string().min(1).max(60) };

export const blockSchema = z.discriminatedUnion('type', [
  z.object({ ...blockId, type: z.literal('video'), assetId: z.string(), caption: localized.optional() }),
  z.object({ ...blockId, type: z.literal('notes'), heading: z.string().max(200), body: localized }),
  z.object({ ...blockId, type: z.literal('dialogue'), lines: z.array(z.object({ speaker: z.string().max(80), fr: z.string().max(500), en: z.string().max(500) })).max(60), assetId: z.string().optional() }),
  z.object({ ...blockId, type: z.literal('phrases'), phrases: z.array(phrase).max(60) }),
  z.object({ ...blockId, type: z.literal('listening'), assetId: z.string(), instructions: localized, questions: z.array(question).max(20) }),
  z.object({ ...blockId, type: z.literal('pronunciation'), focus: localized, items: z.array(z.object({ fr: z.string().max(300), tip: localized, assetId: z.string().optional() })).max(30) }),
  z.object({ ...blockId, type: z.literal('quiz'), questions: z.array(question).max(30) }),
  z.object({ ...blockId, type: z.literal('assignment'), prompt: localized, minWords: z.number().int().min(1).max(2000) }),
  z.object({ ...blockId, type: z.literal('roleplay'), situation: localized, learnerRole: localized, partnerRole: localized, prompts: z.array(z.string().max(400)).max(30) }),
]);

export const createLessonSchema = z.object({
  courseId: z.string().min(1),
  moduleIndex: z.number().int().min(0),
  title: z.string().trim().min(2).max(160),
  level,
  kind: lessonKind,
  minutes: z.number().int().min(1).max(240),
  objective: localized,
  useTemplate: z.boolean().optional(),
});

export const updateLessonSchema = z.object({
  version: z.number().int().optional(),
  patch: z.object({
    moduleIndex: z.number().int().min(0).optional(),
    title: z.string().trim().min(2).max(160).optional(),
    level: level.optional(),
    kind: lessonKind.optional(),
    minutes: z.number().int().min(1).max(240).optional(),
    objective: localized.optional(),
    blocks: z.array(blockSchema).max(40).optional(),
  }),
});

export const transitionSchema = z.object({ note: z.string().trim().max(1000).optional() });
export const editorsSchema = z.object({ tutorIds: z.array(z.string()).max(20) });

export const packSchema = z.object({
  kind: z.enum(['roleplay', 'prompts', 'vocabulary', 'exercise']),
  theme: z.enum(['meetings', 'negotiation', 'presentations', 'interviews', 'travel', 'everyday', 'diplomacy']),
  level,
  title: localized,
  brief: localized,
  prompts: z.array(z.string().trim().min(1).max(400)).min(1).max(30),
  vocabulary: z.array(phrase).max(60),
});

export const assignPackSchema = z.object({
  packId: z.string().min(1),
  learnerId: z.string().min(1),
  note: z.string().trim().max(1000).default(''),
  dueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const responseSchema = z.object({ response: z.string().trim().min(1).max(5000) });
const areaId = z.enum(['conversational', 'business', 'diplomacy', 'policy', 'entrepreneurship', 'everyday', 'academic', 'exams']);
export const registerSchema = z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().email().max(160), areaId });
export const loginSchema = z.object({ email: z.string().trim().email().max(160) });
export const shareSchema = z.object({ share: z.boolean() });
export const reviewSchema = z.object({ grade: z.enum(['again', 'hard', 'good', 'easy']) });
export const reportSchema = z.object({ threadId: z.string().min(1), messageId: z.string().min(1), excerpt: z.string().max(2000), authorId: z.string().min(1), reason: z.enum(['contact', 'inappropriate', 'spam', 'other']), note: z.string().max(500).optional() });
const kidGame = z.enum(['quiz', 'memory', 'builder', 'listen', 'speak', 'live', 'story']);
export const kidCreateSchema = z.object({ name: z.string().trim().min(2).max(30), age: z.number().int().min(4).max(15), level: z.enum(['A1', 'A2']), avatar: z.number().int().min(0).max(7), pin: z.string().regex(/^\d{4}$/) });
export const kidUpdateSchema = z.object({
  name: z.string().trim().min(2).max(30).optional(),
  age: z.number().int().min(4).max(15).optional(),
  level: z.enum(['A1', 'A2']).optional(),
  avatar: z.number().int().min(0).max(7).optional(),
  pin: z.string().regex(/^\d{4}$/).optional(),
  settings: z.object({ dailyMinutes: z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)]).optional(), liveGames: z.boolean().optional(), externalGames: z.boolean().optional(), games: z.record(z.boolean()).optional() }).optional(),
});
export const kidActivitySchema = z.object({ kidId: z.string().min(1), unitId: z.string().min(1), game: kidGame, score: z.number().int().min(0).max(20), total: z.number().int().min(1).max(20) });
export const kidTimeSchema = z.object({ minutes: z.number().min(0).max(5) });
export const externalGameSchema = z.object({ unitId: z.string().min(1), url: z.string().url().max(500), title: z.string().trim().min(3).max(120) });
export const liveCreateSchema = z.object({ unitId: z.string().min(1) });
export const liveJoinSchema = z.object({ kidId: z.string().min(1) });
export const liveAnswerSchema = z.object({ playerId: z.string().min(1), index: z.number().int().min(0).max(50), choice: z.number().int().min(0).max(5) });
export const resolveReportSchema = z.object({ outcome: z.enum(['actioned', 'dismissed']) });
export const feedbackSchema = z.object({ feedback: z.string().trim().min(1).max(5000) });
export const completeLessonSchema = z.object({
  quizScore: z.object({ correct: z.number().int().min(0), total: z.number().int().min(0) }).optional(),
});
export const claimQuestSchema = z.object({ questId: z.enum(['streak-5', 'quiz-ace-3', 'lessons-2', 'practice-1']) });

export const placementSchema = z.object({
  attemptId: z.string().min(1).optional(),
  answers: z.record(z.string(), z.number().int().min(0)),
  writingSample: z.string().trim().max(3000),
  goals: z.array(z.enum(['meetings', 'negotiations', 'presentations', 'interviews', 'diplomacy', 'travel', 'everyday', 'exams'])).max(8),
  hoursPerWeek: z.number().min(0.5).max(40),
  preferredTimes: z.array(z.enum(['morning', 'lunch', 'evening', 'weekend'])).max(4),
});

/** Multipart fields sent alongside an uploaded media file. */
export const mediaMetaSchema = z.object({
  title: z.string().trim().min(1).max(160),
  accent: z.enum(['senegal', 'cote-divoire', 'togo', 'benin', 'cameroon', 'drc', 'morocco', 'france', 'belgium', 'quebec']).optional(),
  speaker: z.string().trim().max(80).optional(),
  transcript: z.string().trim().max(10000).optional(),
  durationSec: z.coerce.number().positive().max(60 * 60),
  replaceId: z.string().optional(),
});

/* ---------- Community ---------- */

export const followSchema = z.object({ learnerId: z.string().min(1), on: z.boolean() });
export const leaderboardVisibilitySchema = z.object({ visible: z.boolean() });
export const startThreadSchema = z.object({ participantId: z.string().min(1), body: z.string().trim().min(1).max(2000) });
export const cohortSchema = z.object({
  name: localized,
  courseId: z.string().min(1),
  tutorId: z.string().min(1),
  level,
  schedule: localized,
});
export const cohortSessionSchema = z.object({ start: isoStart, durationMin: z.number().int().min(15).max(180), topic: z.string().trim().min(2).max(160) });
export const attendanceSchema = z.object({ attended: z.array(z.string()).max(10) });
export const groupAssignmentSchema = z.object({ title: z.string().trim().min(2).max(160), prompt: localized, dueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });
