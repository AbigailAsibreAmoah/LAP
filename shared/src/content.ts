// Content library: lessons built from activity blocks, media assets with Francophone accent tags,
// immersion packs, assignments, a draft → review → published workflow and role permissions.
// Pure functions shared by the API and the offline demo adapter. Callers pass ids and clocks.
import { COURSES, LESSON_CONTENT, LEARNERS, OPENING_VIDEO_MAX_SECONDS, OPENING_VIDEO_MIN_SECONDS, TUTORS } from './demo-data';
import { shiftDatesInPlace } from './clock';
import type { Cohort, Follow, RewardToken } from './community';
import type { ExternalGame, KidActivity, KidProfile } from './kids';
import type { PlacementResult } from './policies';
import type { CefrLevel, LessonKind, Localized, Phrase, QuizQuestion, Role } from './types';

const L = (en: string, fr: string): Localized => ({ en, fr });

/* ---------- Accents ---------- */

export const ACCENTS = {
  senegal: L('Senegal · Dakar', 'Sénégal · Dakar'),
  'cote-divoire': L('Côte d’Ivoire · Abidjan', 'Côte d’Ivoire · Abidjan'),
  togo: L('Togo · Lomé', 'Togo · Lomé'),
  benin: L('Benin · Cotonou', 'Bénin · Cotonou'),
  cameroon: L('Cameroon · Yaoundé', 'Cameroun · Yaoundé'),
  drc: L('DR Congo · Kinshasa', 'RD Congo · Kinshasa'),
  morocco: L('Morocco · Casablanca', 'Maroc · Casablanca'),
  france: L('France · Paris', 'France · Paris'),
  belgium: L('Belgium · Brussels', 'Belgique · Bruxelles'),
  quebec: L('Canada · Québec', 'Canada · Québec'),
} satisfies Record<string, Localized>;
export type AccentId = keyof typeof ACCENTS;

/* ---------- Types ---------- */

export type ContentStatus = 'draft' | 'in-review' | 'published' | 'archived';

export interface MediaAsset {
  id: string;
  kind: 'video' | 'audio';
  title: string;
  durationSec: number;
  accent?: AccentId;
  speaker?: string;
  /** French transcript: used for captions, accessibility and low-data mode. */
  transcript?: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  /** null = planned asset whose recording or filming has not been delivered yet. */
  url: string | null;
  /** Server-side stored file name (never a path); used to stream the file. */
  storageKey?: string;
  uploadedBy: string;
  uploadedAt: string;
}

export type DialogueLine = { speaker: string; fr: string; en: string };
export type PronunciationItem = { fr: string; tip: Localized; assetId?: string };

export type Block =
  | { id: string; type: 'video'; assetId: string; caption?: Localized }
  | { id: string; type: 'notes'; heading: string; body: Localized }
  | { id: string; type: 'dialogue'; lines: DialogueLine[]; assetId?: string }
  | { id: string; type: 'phrases'; phrases: Phrase[] }
  | { id: string; type: 'listening'; assetId: string; instructions: Localized; questions: QuizQuestion[] }
  | { id: string; type: 'pronunciation'; focus: Localized; items: PronunciationItem[] }
  | { id: string; type: 'quiz'; questions: QuizQuestion[] }
  | { id: string; type: 'assignment'; prompt: Localized; minWords: number }
  | { id: string; type: 'roleplay'; situation: Localized; learnerRole: Localized; partnerRole: Localized; prompts: string[] };
export type BlockType = Block['type'];

export const BLOCK_LABEL: Record<BlockType, Localized> = {
  video: L('Video', 'Vidéo'),
  notes: L('Study notes', 'Notes d’étude'),
  dialogue: L('Dialogue', 'Dialogue'),
  phrases: L('Key phrases', 'Expressions clés'),
  listening: L('Listening activity', 'Compréhension orale'),
  pronunciation: L('Pronunciation', 'Prononciation'),
  quiz: L('Quiz', 'Quiz'),
  assignment: L('Written assignment', 'Devoir écrit'),
  roleplay: L('Role play', 'Jeu de rôle'),
};

export interface HistoryEntry {
  at: string;
  by: string;
  action: 'created' | 'edited' | 'submitted' | 'published' | 'changes-requested' | 'archived' | 'restored';
  note?: string;
}

export interface LessonDoc {
  id: string;
  courseId: string;
  moduleIndex: number;
  position: number;
  title: string;
  level: CefrLevel;
  kind: LessonKind;
  minutes: number;
  objective: Localized;
  blocks: Block[];
  status: ContentStatus;
  version: number;
  authorId: string;
  updatedBy: string;
  updatedAt: string;
  publishedAt?: string;
  reviewNote?: string;
  history: HistoryEntry[];
}

export type PackKind = 'roleplay' | 'prompts' | 'vocabulary' | 'exercise';
export type PackTheme = 'meetings' | 'negotiation' | 'presentations' | 'interviews' | 'travel' | 'everyday' | 'diplomacy';

export interface ImmersionPack {
  id: string;
  kind: PackKind;
  theme: PackTheme;
  level: CefrLevel;
  title: Localized;
  brief: Localized;
  /** Prompts / role-play turns, in French. */
  prompts: string[];
  vocabulary: Phrase[];
  authorId: string;
  updatedAt: string;
}

export interface PackAssignment {
  id: string;
  packId: string;
  learnerId: string;
  tutorId: string;
  note: string;
  dueOn?: string;
  assignedAt: string;
  status: 'assigned' | 'submitted' | 'reviewed';
  response?: string;
  submittedAt?: string;
  feedback?: string;
  reviewedAt?: string;
}

export interface LessonCompletion {
  learnerId: string;
  lessonId: string;
  at: string;
  quizScore?: { correct: number; total: number };
}

export interface ContentState {
  lessons: LessonDoc[];
  media: MediaAsset[];
  packs: ImmersionPack[];
  assignments: PackAssignment[];
  /** Extra instructors authorised to edit a course, beyond its lead tutor. */
  editors: Record<string, string[]>;
  completions: LessonCompletion[];
  placements: PlacementResult[];
  rewards: RewardClaim[];
  cohorts: Cohort[];
  follows: Follow[];
  tokens: RewardToken[];
  /** Learners who chose not to appear on the leaderboard. */
  leaderboardOptOut: string[];
  /** Messages flagged by a participant, for the support team to review. */
  reports: MessageReport[];
  /** La Porte Kids: child profiles (under a parent), their game results, and linked outside games. */
  kids: KidProfile[];
  kidActivities: KidActivity[];
  externalGames: ExternalGame[];
}

export const REPORT_REASONS = {
  contact: { en: 'Asking for or sharing contact details', fr: 'Demande ou partage de coordonnées' },
  inappropriate: { en: 'Inappropriate or offensive', fr: 'Inapproprié ou offensant' },
  spam: { en: 'Spam or advertising', fr: 'Spam ou publicité' },
  other: { en: 'Something else', fr: 'Autre chose' },
} satisfies Record<string, Localized>;
export type ReportReason = keyof typeof REPORT_REASONS;

export interface MessageReport {
  id: string;
  threadId: string;
  messageId: string;
  /** Copied at report time so the review still works if the thread changes. */
  excerpt: string;
  authorId: string;
  reporterId: string;
  reason: ReportReason;
  note?: string;
  at: string;
  status: 'open' | 'actioned' | 'dismissed';
  resolvedBy?: string;
  resolvedAt?: string;
}

/* ---------- Rewards: weekly quests tied to real learning actions ---------- */

export interface RewardClaim {
  learnerId: string;
  questId: QuestId;
  /** Monday (YYYY-MM-DD) of the week the quest belongs to. */
  week: string;
  points: number;
  at: string;
}

export const QUESTS = {
  'streak-5': { icon: 'flame', target: 5, points: 5, title: L('Study 5 days in a row', 'Étudier 5 jours d’affilée') },
  'quiz-ace-3': { icon: 'star', target: 3, points: 15, title: L('Ace 3 quizzes first time', 'Réussir 3 quiz du premier coup') },
  'lessons-2': { icon: 'book', target: 2, points: 10, title: L('Finish 2 lessons this week', 'Terminer 2 leçons cette semaine') },
  'practice-1': { icon: 'mic', target: 1, points: 10, title: L('Complete 1 practice from your tutor', 'Faire 1 exercice de votre tuteur') },
} as const;
export type QuestId = keyof typeof QUESTS;

/** Monday of the ISO week containing `iso`, as YYYY-MM-DD. */
export function weekOf(iso: string) {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** Progress counts only activity from the last 7 days, so quests reflect current effort. */
export function questProgress(state: ContentState, learner: { id: string; streakDays: number }, now: string) {
  const since = new Date(new Date(now).getTime() - 7 * 86_400_000).toISOString();
  const recent = state.completions.filter((c) => c.learnerId === learner.id && c.at >= since);
  const week = weekOf(now);
  const counts: Record<QuestId, number> = {
    'streak-5': learner.streakDays,
    'quiz-ace-3': recent.filter((c) => c.quizScore && c.quizScore.total > 0 && c.quizScore.correct === c.quizScore.total).length,
    'lessons-2': recent.length,
    'practice-1': state.assignments.filter((a) => a.learnerId === learner.id && a.submittedAt && a.submittedAt >= since).length,
  };
  return (Object.keys(QUESTS) as QuestId[]).map((id) => {
    const q = QUESTS[id];
    const claimed = state.rewards.some((r) => r.learnerId === learner.id && r.questId === id && r.week === week);
    const value = Math.min(q.target, counts[id]);
    return { id, ...q, value, done: value >= q.target, claimed };
  });
}

export const pointsFor = (state: ContentState, learnerId: string) => state.rewards.filter((r) => r.learnerId === learnerId).reduce((n, r) => n + r.points, 0);

export type ContentUser = { id: string; role: Role };

export class ContentError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

/* ---------- Permissions ---------- */

export function courseEditors(state: ContentState, courseId: string): string[] {
  const lead = COURSES.find((c) => c.id === courseId)?.tutorId;
  return [...new Set([...(lead ? [lead] : []), ...(state.editors[courseId] ?? [])])];
}

export function canEditCourse(state: ContentState, user: ContentUser, courseId: string) {
  return user.role === 'admin' || (user.role === 'instructor' && courseEditors(state, courseId).includes(user.id));
}

/** Instructors edit drafts in courses they are authorised for; admins edit anything not archived. */
export function canEditLesson(state: ContentState, user: ContentUser, lesson: LessonDoc) {
  if (lesson.status === 'archived') return false;
  if (user.role === 'admin') return true;
  return user.role === 'instructor' && lesson.status === 'draft' && canEditCourse(state, user, lesson.courseId);
}

export const canPublish = (user: ContentUser) => user.role === 'admin';
export const canUpload = (user: ContentUser) => user.role === 'admin' || user.role === 'instructor';
export const canManagePacks = canUpload;

/* ---------- Validation ---------- */

export interface Issue {
  severity: 'error' | 'warning';
  message: Localized;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

/** Everything that must be true before a lesson can be submitted or published. */
export function lessonIssues(lesson: LessonDoc, media: MediaAsset[]): Issue[] {
  const issues: Issue[] = [];
  const asset = (id: string) => media.find((m) => m.id === id);
  if (!lesson.title.trim()) issues.push({ severity: 'error', message: L('Add a lesson title.', 'Ajoutez un titre.') });
  if (!lesson.objective.en.trim() || !lesson.objective.fr.trim()) issues.push({ severity: 'error', message: L('Write the learning objective in English and French.', 'Rédigez l’objectif en anglais et en français.') });

  const first = lesson.blocks[0];
  if (!first || first.type !== 'video') {
    issues.push({ severity: 'error', message: L('Every lesson must open with a video of about 5 minutes.', 'Chaque leçon doit commencer par une vidéo d’environ 5 minutes.') });
  } else {
    const v = asset(first.assetId);
    if (!v) issues.push({ severity: 'error', message: L('Choose the opening video.', 'Choisissez la vidéo d’ouverture.') });
    else if (v.durationSec < OPENING_VIDEO_MIN_SECONDS || v.durationSec > OPENING_VIDEO_MAX_SECONDS)
      issues.push({ severity: 'error', message: L(`Opening video is ${fmt(v.durationSec)}; it must be about 5 minutes (4:00–6:00).`, `La vidéo d’ouverture dure ${fmt(v.durationSec)} ; elle doit durer environ 5 minutes (4:00–6:00).`) });
    else if (!v.url) issues.push({ severity: 'warning', message: L('Opening video file not uploaded yet: learners see a “video in production” placeholder.', 'Vidéo d’ouverture pas encore téléversée : les apprenants voient « vidéo en production ».') });
  }
  if (lesson.blocks.length < 2) issues.push({ severity: 'error', message: L('Add at least one activity after the video.', 'Ajoutez au moins une activité après la vidéo.') });

  for (const b of lesson.blocks) {
    const label = BLOCK_LABEL[b.type];
    const bad = (en: string, fr: string) => issues.push({ severity: 'error', message: L(`${label.en}: ${en}`, `${label.fr} : ${fr}`) });
    if ((b.type === 'quiz' || b.type === 'listening') && !b.questions.length) bad('add at least one question.', 'ajoutez au moins une question.');
    if (b.type === 'quiz' || b.type === 'listening')
      for (const q of b.questions) if (!q.prompt.trim() || q.options.filter((o) => o.trim()).length < 2 || q.answer < 0 || q.answer >= q.options.length) bad('each question needs a prompt, two options and a correct answer.', 'chaque question doit avoir un énoncé, deux options et une bonne réponse.');
    if (b.type === 'listening' && !asset(b.assetId)) bad('choose an audio recording.', 'choisissez un enregistrement audio.');
    if (b.type === 'phrases' && !b.phrases.length) bad('add at least one phrase.', 'ajoutez au moins une expression.');
    if (b.type === 'dialogue' && !b.lines.length) bad('add at least one line.', 'ajoutez au moins une réplique.');
    if (b.type === 'pronunciation' && !b.items.length) bad('add at least one item.', 'ajoutez au moins un élément.');
    if (b.type === 'assignment' && (!b.prompt.en.trim() || b.minWords < 1)) bad('write the prompt and a minimum word count.', 'rédigez la consigne et un nombre minimum de mots.');
    if (b.type === 'roleplay' && !b.prompts.length) bad('add the conversation prompts.', 'ajoutez les répliques.');
    if (b.type === 'notes' && !b.body.en.trim() && !b.body.fr.trim()) bad('write the notes.', 'rédigez les notes.');
  }
  return issues;
}

/** Uploads: videos may not exceed the opening-video maximum. */
export function mediaIssues(m: Pick<MediaAsset, 'kind' | 'durationSec' | 'title'>): string | null {
  if (!m.title.trim()) return 'Give the file a title.';
  if (!(m.durationSec > 0)) return 'Could not read the media duration.';
  if (m.kind === 'video' && m.durationSec > OPENING_VIDEO_MAX_SECONDS) return `Videos must be 6 minutes or shorter (this one is ${fmt(m.durationSec)}).`;
  if (m.kind === 'audio' && m.durationSec > 15 * 60) return 'Audio recordings must be 15 minutes or shorter.';
  return null;
}

/* ---------- Visibility ---------- */

/** What a given user may see. Learners never receive drafts or other learners' work. */
export function visibleContent(state: ContentState, user: ContentUser): ContentState {
  if (user.role === 'admin') return state;
  if (user.role === 'instructor')
    return {
      ...state,
      lessons: state.lessons,
      assignments: state.assignments.filter((a) => a.tutorId === user.id),
      tokens: [],
      completions: state.completions,
      placements: state.placements,
      reports: [],
      // Tutors never see children's profiles; in live games they see safe nicknames only.
      kids: [],
      kidActivities: [],
    };
  return {
    ...state,
    lessons: state.lessons.filter((l) => l.status === 'published'),
    assignments: state.assignments.filter((a) => a.learnerId === user.id),
    completions: state.completions.filter((c) => c.learnerId === user.id),
    placements: state.placements.filter((p) => p.learnerId === user.id),
    // Leaderboard needs everyone's totals; claims carry no private data beyond points.
    rewards: state.rewards,
    tokens: state.tokens.filter((t) => t.learnerId === user.id),
    // A learner only sees the reports they made (so the message shows as reported).
    reports: state.reports.filter((r) => r.reporterId === user.id),
    // A parent sees only their own children.
    kids: state.kids.filter((k) => k.parentId === user.id),
    kidActivities: state.kidActivities.filter((a) => state.kids.some((k) => k.id === a.kidId && k.parentId === user.id)),
    // Group answers are visible to the instructor only; a learner sees their own — and, when the instructor
    // turns sharing on, the group's answers once they have sent theirs.
    cohorts: state.cohorts.map((c) => ({ ...c, assignments: c.assignments.map((a) => ({ ...a, responses: a.shareAnswers && a.responses.some((r) => r.learnerId === user.id) ? a.responses : a.responses.filter((r) => r.learnerId === user.id) })), sessions: c.memberIds.includes(user.id) ? c.sessions : c.sessions.map((s) => ({ ...s, attended: null })) })),
    editors: {},
  };
}

export interface OutlineEntry {
  id: string;
  title: string;
  minutes: number;
  kind: LessonKind;
  videoSec?: number;
  status: ContentStatus;
  available: boolean;
}

/** Course outline from the content store: archived lessons are hidden, unpublished ones show as “coming soon”. */
export function courseOutline(state: ContentState, courseId: string) {
  const course = COURSES.find((c) => c.id === courseId);
  if (!course) return [];
  return course.modules.map((m, i) => ({
    title: m.title,
    lessons: state.lessons
      .filter((l) => l.courseId === courseId && l.moduleIndex === i && l.status !== 'archived')
      .sort((a, b) => a.position - b.position)
      .map((l): OutlineEntry => {
        const first = l.blocks[0];
        const v = first?.type === 'video' ? state.media.find((x) => x.id === first.assetId) : undefined;
        return { id: l.id, title: l.title, minutes: l.minutes, kind: l.kind, videoSec: v?.durationSec, status: l.status, available: l.status === 'published' };
      }),
  }));
}

/* ---------- Operations ---------- */

type Ctx = { user: ContentUser; now: string; newId: (prefix: string) => string };

const fail = (status: number, code: string, message: string): never => {
  throw new ContentError(status, code, message);
};
const findLesson = (s: ContentState, id: string) => s.lessons.find((l) => l.id === id) ?? fail(404, 'not_found', 'Lesson not found');

export function newBlock(type: BlockType, newId: (p: string) => string, defaults: { videoAssetId?: string; audioAssetId?: string } = {}): Block {
  const id = newId('blk');
  const q = (): QuizQuestion => ({ id: newId('q'), prompt: '', options: ['', '', ''], answer: 0, explanation: L('', '') });
  switch (type) {
    case 'video': return { id, type, assetId: defaults.videoAssetId ?? '' };
    case 'notes': return { id, type, heading: '', body: L('', '') };
    case 'dialogue': return { id, type, lines: [{ speaker: '', fr: '', en: '' }] };
    case 'phrases': return { id, type, phrases: [{ fr: '', en: '' }] };
    case 'listening': return { id, type, assetId: defaults.audioAssetId ?? '', instructions: L('Listen, then answer.', 'Écoutez, puis répondez.'), questions: [q()] };
    case 'pronunciation': return { id, type, focus: L('', ''), items: [{ fr: '', tip: L('', '') }] };
    case 'quiz': return { id, type, questions: [q()] };
    case 'assignment': return { id, type, prompt: L('', ''), minWords: 40 };
    case 'roleplay': return { id, type, situation: L('', ''), learnerRole: L('', ''), partnerRole: L('', ''), prompts: [] };
  }
}

/** The standard La Porte lesson structure, so every new lesson starts from the same shape. */
export function lessonTemplate(newId: (p: string) => string): Block[] {
  return (['video', 'notes', 'phrases', 'listening', 'pronunciation', 'quiz', 'assignment'] as BlockType[]).map((t) => newBlock(t, newId));
}

const log = (l: LessonDoc, ctx: Ctx, action: HistoryEntry['action'], note?: string) => {
  l.history = [{ at: ctx.now, by: ctx.user.id, action, ...(note ? { note } : {}) }, ...l.history].slice(0, 40);
  l.updatedAt = ctx.now;
  l.updatedBy = ctx.user.id;
};

export type LessonInput = Pick<LessonDoc, 'courseId' | 'moduleIndex' | 'title' | 'level' | 'kind' | 'minutes' | 'objective'>;
export type LessonPatch = Partial<Pick<LessonDoc, 'moduleIndex' | 'title' | 'level' | 'kind' | 'minutes' | 'objective' | 'blocks'>>;
export type TransitionAction = 'submit' | 'publish' | 'request-changes' | 'archive' | 'restore';
export type PackInput = Pick<ImmersionPack, 'kind' | 'theme' | 'level' | 'title' | 'brief' | 'prompts' | 'vocabulary'>;

export const contentOps = {
  createLesson(state: ContentState, ctx: Ctx, input: LessonInput & { useTemplate?: boolean }) {
    const course = COURSES.find((c) => c.id === input.courseId) ?? fail(404, 'not_found', 'Course not found');
    if (!canEditCourse(state, ctx.user, course.id)) fail(403, 'forbidden', 'You are not authorised to add lessons to this course.');
    if (input.moduleIndex < 0 || input.moduleIndex >= course.modules.length) fail(422, 'invalid_module', 'Choose a module of this course.');
    const next = structuredClone(state);
    const position = Math.max(-1, ...next.lessons.filter((l) => l.courseId === course.id && l.moduleIndex === input.moduleIndex).map((l) => l.position)) + 1;
    const lesson: LessonDoc = {
      ...input,
      id: ctx.newId('les'),
      position,
      blocks: input.useTemplate === false ? [newBlock('video', ctx.newId)] : lessonTemplate(ctx.newId),
      status: 'draft',
      version: 1,
      authorId: ctx.user.id,
      updatedBy: ctx.user.id,
      updatedAt: ctx.now,
      history: [],
    };
    log(lesson, ctx, 'created');
    next.lessons.push(lesson);
    return { state: next, lesson };
  },

  updateLesson(state: ContentState, ctx: Ctx, id: string, patch: LessonPatch, expectedVersion?: number) {
    const next = structuredClone(state);
    const lesson = findLesson(next, id);
    if (!canEditLesson(next, ctx.user, lesson)) fail(403, 'forbidden', lesson.status === 'draft' ? 'You are not authorised to edit this course.' : 'Only drafts can be edited by instructors. Ask an administrator.');
    if (expectedVersion !== undefined && expectedVersion !== lesson.version) fail(409, 'version_conflict', 'Someone else saved this lesson since you opened it. Reload to see their changes.');
    if (patch.moduleIndex !== undefined) {
      const course = COURSES.find((c) => c.id === lesson.courseId)!;
      if (patch.moduleIndex < 0 || patch.moduleIndex >= course.modules.length) fail(422, 'invalid_module', 'Choose a module of this course.');
    }
    if (patch.blocks?.some((b) => (b.type === 'video' || b.type === 'listening') && b.assetId && !next.media.some((m) => m.id === b.assetId)))
      fail(422, 'unknown_media', 'A block refers to a media file that does not exist.');
    Object.assign(lesson, patch);
    lesson.version += 1;
    // A published lesson edited by an admin stays live; record it.
    log(lesson, ctx, 'edited');
    if (lesson.status === 'published') {
      const errors = lessonIssues(lesson, next.media).filter((i) => i.severity === 'error');
      if (errors.length) fail(422, 'invalid_lesson', `Published lessons must stay complete: ${errors[0].message.en}`);
    }
    return { state: next, lesson };
  },

  transition(state: ContentState, ctx: Ctx, id: string, action: TransitionAction, note?: string) {
    const next = structuredClone(state);
    const lesson = findLesson(next, id);
    const errors = () => lessonIssues(lesson, next.media).filter((i) => i.severity === 'error');
    switch (action) {
      case 'submit':
        if (lesson.status !== 'draft') fail(409, 'invalid_status', 'Only drafts can be submitted for review.');
        if (!canEditLesson(next, ctx.user, lesson)) fail(403, 'forbidden', 'You are not authorised to submit this lesson.');
        if (errors().length) fail(422, 'invalid_lesson', errors()[0].message.en);
        lesson.status = 'in-review';
        lesson.reviewNote = undefined;
        log(lesson, ctx, 'submitted', note);
        break;
      case 'publish':
        if (!canPublish(ctx.user)) fail(403, 'forbidden', 'Only administrators can publish.');
        if (lesson.status !== 'draft' && lesson.status !== 'in-review') fail(409, 'invalid_status', 'This lesson cannot be published from its current status.');
        if (errors().length) fail(422, 'invalid_lesson', errors()[0].message.en);
        lesson.status = 'published';
        lesson.publishedAt = ctx.now;
        lesson.reviewNote = undefined;
        log(lesson, ctx, 'published', note);
        break;
      case 'request-changes':
        if (!canPublish(ctx.user)) fail(403, 'forbidden', 'Only administrators can review.');
        if (lesson.status !== 'in-review') fail(409, 'invalid_status', 'Only lessons in review can be sent back.');
        if (!note?.trim()) fail(422, 'note_required', 'Explain what needs to change.');
        lesson.status = 'draft';
        lesson.reviewNote = note;
        log(lesson, ctx, 'changes-requested', note);
        break;
      case 'archive':
        if (!canPublish(ctx.user)) fail(403, 'forbidden', 'Only administrators can archive.');
        if (lesson.status === 'archived') fail(409, 'invalid_status', 'Already archived.');
        lesson.status = 'archived';
        log(lesson, ctx, 'archived', note);
        break;
      case 'restore':
        if (!canPublish(ctx.user)) fail(403, 'forbidden', 'Only administrators can restore.');
        if (lesson.status !== 'archived') fail(409, 'invalid_status', 'Only archived lessons can be restored.');
        lesson.status = 'draft';
        log(lesson, ctx, 'restored', note);
        break;
    }
    lesson.version += 1;
    return { state: next, lesson };
  },

  addMedia(state: ContentState, ctx: Ctx, input: Omit<MediaAsset, 'id' | 'uploadedBy' | 'uploadedAt'>) {
    if (!canUpload(ctx.user)) fail(403, 'forbidden', 'Only instructors and administrators can upload.');
    const problem = mediaIssues(input);
    if (problem) fail(422, input.kind === 'video' && input.durationSec > OPENING_VIDEO_MAX_SECONDS ? 'video_too_long' : 'invalid_media', problem);
    const next = structuredClone(state);
    const asset: MediaAsset = { ...input, id: ctx.newId(input.kind === 'video' ? 'vid' : 'aud'), uploadedBy: ctx.user.id, uploadedAt: ctx.now };
    next.media.unshift(asset);
    return { state: next, asset };
  },

  /** Attach an uploaded file to a planned asset (e.g. the filmed opening video arrives). */
  replaceMediaFile(state: ContentState, ctx: Ctx, id: string, file: Pick<MediaAsset, 'url' | 'fileName' | 'mimeType' | 'sizeBytes' | 'durationSec' | 'storageKey'>) {
    if (!canUpload(ctx.user)) fail(403, 'forbidden', 'Only instructors and administrators can upload.');
    const next = structuredClone(state);
    const asset = next.media.find((m) => m.id === id) ?? fail(404, 'not_found', 'Media not found');
    const problem = mediaIssues({ ...asset, durationSec: file.durationSec });
    if (problem) fail(422, 'video_too_long', problem);
    Object.assign(asset, file, { uploadedBy: ctx.user.id, uploadedAt: ctx.now });
    return { state: next, asset };
  },

  deleteMedia(state: ContentState, ctx: Ctx, id: string) {
    const next = structuredClone(state);
    const asset = next.media.find((m) => m.id === id) ?? fail(404, 'not_found', 'Media not found');
    if (ctx.user.role !== 'admin' && asset.uploadedBy !== ctx.user.id) fail(403, 'forbidden', 'You can only delete your own uploads.');
    const usedIn = next.lessons.filter((l) => l.status !== 'archived' && l.blocks.some((b) => ('assetId' in b && b.assetId === id) || (b.type === 'pronunciation' && b.items.some((i) => i.assetId === id))));
    if (usedIn.length) fail(409, 'media_in_use', `Used in ${usedIn.length} lesson(s): ${usedIn.map((l) => l.title).join(', ')}.`);
    next.media = next.media.filter((m) => m.id !== id);
    return { state: next, asset };
  },

  setEditors(state: ContentState, ctx: Ctx, courseId: string, tutorIds: string[]) {
    if (ctx.user.role !== 'admin') fail(403, 'forbidden', 'Only administrators can grant editing rights.');
    if (!COURSES.some((c) => c.id === courseId)) fail(404, 'not_found', 'Course not found');
    const unknown = tutorIds.find((t) => !TUTORS.some((x) => x.id === t));
    if (unknown) fail(422, 'unknown_tutor', `Unknown instructor ${unknown}`);
    const next = structuredClone(state);
    next.editors[courseId] = [...new Set(tutorIds)];
    return { state: next };
  },

  savePack(state: ContentState, ctx: Ctx, input: PackInput, id?: string) {
    if (!canManagePacks(ctx.user)) fail(403, 'forbidden', 'Only instructors and administrators can manage immersion packs.');
    if (!input.title.en.trim() || !input.prompts.length) fail(422, 'invalid_pack', 'A pack needs a title and at least one prompt.');
    const next = structuredClone(state);
    if (id) {
      const pack = next.packs.find((p) => p.id === id) ?? fail(404, 'not_found', 'Pack not found');
      if (ctx.user.role !== 'admin' && pack.authorId !== ctx.user.id) fail(403, 'forbidden', 'You can only edit packs you created.');
      Object.assign(pack, input, { updatedAt: ctx.now });
      return { state: next, pack };
    }
    const pack: ImmersionPack = { ...input, id: ctx.newId('pk'), authorId: ctx.user.id, updatedAt: ctx.now };
    next.packs.unshift(pack);
    return { state: next, pack };
  },

  assignPack(state: ContentState, ctx: Ctx, input: { packId: string; learnerId: string; note: string; dueOn?: string }) {
    if (!canManagePacks(ctx.user)) fail(403, 'forbidden', 'Only instructors and administrators can assign practice.');
    if (!state.packs.some((p) => p.id === input.packId)) fail(404, 'not_found', 'Pack not found');
    if (!LEARNERS.some((l) => l.id === input.learnerId)) fail(404, 'not_found', 'Learner not found');
    const next = structuredClone(state);
    const assignment: PackAssignment = { ...input, id: ctx.newId('as'), tutorId: ctx.user.role === 'instructor' ? ctx.user.id : 'tut-sophie', assignedAt: ctx.now, status: 'assigned' };
    next.assignments.unshift(assignment);
    return { state: next, assignment };
  },

  submitAssignment(state: ContentState, ctx: Ctx, id: string, response: string) {
    const next = structuredClone(state);
    const a = next.assignments.find((x) => x.id === id) ?? fail(404, 'not_found', 'Assignment not found');
    if (a.learnerId !== ctx.user.id) fail(403, 'forbidden', 'This practice was assigned to someone else.');
    if (a.status === 'reviewed') fail(409, 'already_reviewed', 'Your tutor has already reviewed this.');
    if (response.trim().split(/\s+/).length < 5) fail(422, 'too_short', 'Write at least a few sentences.');
    Object.assign(a, { response, submittedAt: ctx.now, status: 'submitted' as const });
    return { state: next, assignment: a };
  },

  reviewAssignment(state: ContentState, ctx: Ctx, id: string, feedback: string) {
    const next = structuredClone(state);
    const a = next.assignments.find((x) => x.id === id) ?? fail(404, 'not_found', 'Assignment not found');
    if (ctx.user.role !== 'admin' && a.tutorId !== ctx.user.id) fail(403, 'forbidden', 'Only the assigning tutor can review this.');
    if (a.status !== 'submitted') fail(409, 'not_submitted', 'The learner has not submitted a response yet.');
    if (!feedback.trim()) fail(422, 'feedback_required', 'Write your feedback.');
    Object.assign(a, { feedback, reviewedAt: ctx.now, status: 'reviewed' as const });
    return { state: next, assignment: a };
  },

  completeLesson(state: ContentState, ctx: Ctx, lessonId: string, quizScore?: { correct: number; total: number }) {
    if (ctx.user.role !== 'learner') fail(403, 'forbidden', 'Only learners record lesson completion.');
    const lesson = findLesson(state, lessonId);
    if (lesson.status !== 'published') fail(409, 'not_published', 'This lesson is not available yet.');
    const next = structuredClone(state);
    next.completions = next.completions.filter((c) => !(c.learnerId === ctx.user.id && c.lessonId === lessonId));
    next.completions.push({ learnerId: ctx.user.id, lessonId, at: ctx.now, ...(quizScore ? { quizScore } : {}) });
    return { state: next };
  },

  /** Grants a quest's points once per week, only if the server-side progress shows it is done. */
  claimQuest(state: ContentState, ctx: Ctx, learner: { id: string; streakDays: number }, questId: QuestId) {
    if (ctx.user.role !== 'learner' || learner.id !== ctx.user.id) fail(403, 'forbidden', 'Learners claim their own rewards.');
    const quest = questProgress(state, learner, ctx.now).find((q) => q.id === questId) ?? fail(404, 'not_found', 'Quest not found');
    if (quest.claimed) fail(409, 'already_claimed', 'You already claimed this reward this week.');
    if (!quest.done) fail(409, 'not_complete', `Keep going: ${quest.value}/${quest.target}.`);
    const next = structuredClone(state);
    next.rewards.push({ learnerId: learner.id, questId, week: weekOf(ctx.now), points: quest.points, at: ctx.now });
    return { state: grantTokens(next, learner.id, ctx), points: pointsFor(next, learner.id) };
  },

  reportMessage(state: ContentState, ctx: Ctx, input: Pick<MessageReport, 'threadId' | 'messageId' | 'excerpt' | 'authorId' | 'reason' | 'note'>) {
    if (input.authorId === ctx.user.id) fail(422, 'own_message', 'You cannot report your own message.');
    if (!(input.reason in REPORT_REASONS)) fail(422, 'invalid_reason', 'Choose a reason.');
    const next = structuredClone(state);
    const existing = next.reports.find((r) => r.messageId === input.messageId && r.reporterId === ctx.user.id);
    if (existing) return { state: next, report: existing };
    const report: MessageReport = { ...input, excerpt: input.excerpt.slice(0, 500), id: ctx.newId('rep'), reporterId: ctx.user.id, at: ctx.now, status: 'open' };
    next.reports.unshift(report);
    return { state: next, report };
  },

  resolveReport(state: ContentState, ctx: Ctx, id: string, outcome: 'actioned' | 'dismissed') {
    if (ctx.user.role !== 'admin') fail(403, 'forbidden', 'Only the support team reviews reports.');
    const next = structuredClone(state);
    const report = next.reports.find((r) => r.id === id) ?? fail(404, 'not_found', 'Report not found');
    Object.assign(report, { status: outcome, resolvedBy: ctx.user.id, resolvedAt: ctx.now });
    return { state: next, report };
  },

  recordPlacement(state: ContentState, ctx: Ctx, result: PlacementResult) {
    if (ctx.user.role !== 'learner' || result.learnerId !== ctx.user.id) fail(403, 'forbidden', 'Learners record their own placement.');
    // Learners may skip the test and start at A1; a writing sample is only needed when they take it.
    const tookTest = Object.keys(result.answers).length > 0;
    if (tookTest && result.writingSample.trim().split(/\s+/).filter(Boolean).length < 15) fail(422, 'too_short', 'Write at least 15 words in French.');
    const next = structuredClone(state);
    next.placements = [result, ...next.placements.filter((p) => p.learnerId !== ctx.user.id)];
    return { state: next };
  },
};

/** Set by community.ts at load time (avoids a runtime import cycle). */
let grantTokens: (s: ContentState, learnerId: string, ctx: { now: string; newId: (p: string) => string }) => ContentState = (s) => s;
export function registerTokenGranter(fn: typeof grantTokens) {
  grantTokens = fn;
}

/* ---------- Seed library ---------- */

const SEED_AT = '2026-10-01T09:00:00Z';
const q = (id: string, prompt: string, options: string[], answer: number, en: string, fr: string): QuizQuestion => ({ id, prompt, options, answer, explanation: L(en, fr) });

/** Accent recordings planned for the first lessons. Files are delivered by the recording team. */
const SEED_AUDIO: MediaAsset[] = [
  { id: 'aud-abidjan-meeting', kind: 'audio', title: 'Réunion : reporter le lancement', durationSec: 74, accent: 'cote-divoire', speaker: 'Awa Koné', transcript: 'Bonjour à tous. Je propose de reporter le lancement à janvier, parce que le fournisseur de Lomé n’a pas encore livré les emballages. Qu’en pensez-vous ? — Je comprends votre point de vue, mais je ne suis pas tout à fait d’accord. Nos partenaires sont prêts, et décembre reste possible.', url: null, uploadedBy: 'tut-sophie', uploadedAt: SEED_AT },
  { id: 'aud-dakar-directions', kind: 'audio', title: 'Demander son chemin à Dakar', durationSec: 58, accent: 'senegal', speaker: 'Moussa Diop', transcript: 'Excusez-moi, pour aller au marché Sandaga, s’il vous plaît ? — Vous allez tout droit jusqu’au rond-point, puis vous tournez à gauche. C’est à cinq minutes à pied, en face de la pharmacie.', url: null, uploadedBy: 'tut-aicha', uploadedAt: SEED_AT },
  { id: 'aud-lome-greetings', kind: 'audio', title: 'Salutations au bureau à Lomé', durationSec: 42, accent: 'togo', speaker: 'Edem Agbeko', transcript: 'Bonjour madame, vous allez bien ? — Très bien, merci, et vous ? — Ça va, merci. Je vous présente Kofi, notre nouveau collègue d’Accra.', url: null, uploadedBy: 'tut-sophie', uploadedAt: SEED_AT },
  { id: 'aud-yaounde-intro', kind: 'audio', title: 'Se présenter : Yaoundé', durationSec: 35, accent: 'cameroon', speaker: 'Brice Mbarga', transcript: 'Je m’appelle Brice. Je suis ingénieur et je travaille à Yaoundé, dans une entreprise de télécommunications.', url: null, uploadedBy: 'tut-thomas', uploadedAt: SEED_AT },
  { id: 'aud-paris-liaison', kind: 'audio', title: 'Les liaisons : modèle', durationSec: 40, accent: 'france', speaker: 'Sophie Laurent', transcript: 'Nous avons. Vous êtes. Les amis. Ils ont un projet. C’est un excellent exemple.', url: null, uploadedBy: 'tut-sophie', uploadedAt: SEED_AT },
  { id: 'aud-kinshasa-negotiation', kind: 'audio', title: 'Négocier un délai de livraison', durationSec: 81, accent: 'drc', speaker: 'Patrick Mukendi', transcript: 'Nous pouvons accepter ce prix, à condition que la livraison soit faite avant la fin du mois. Sinon, il faudra revoir les conditions.', url: null, uploadedBy: 'tut-thomas', uploadedAt: SEED_AT },
];

/** Fully written starter lessons (the teaching team extends this library progressively). */
const RICH: Record<string, { objective: Localized; level: CefrLevel; blocks: (videoId: string) => Block[] }> = {
  'les-b5': {
    level: 'A2',
    objective: LESSON_CONTENT[0].objective,
    blocks: (v) => [
      { id: 'b5-video', type: 'video', assetId: v, caption: L('Sophie walks through polite agreement and disagreement in a meeting.', 'Sophie présente l’accord et le désaccord polis en réunion.') },
      { id: 'b5-notes', type: 'notes', heading: 'Nuancer son avis', body: L('In French meetings, disagreement is softened. Acknowledge first (“Je comprends votre point de vue…”), then contrast with “mais”, and give a reason (“parce que…”, “à mon avis…”). “Pas tout à fait” keeps the tone respectful.', 'En réunion, on atténue le désaccord : on reconnaît d’abord le point de vue (« Je comprends… »), on oppose avec « mais », puis on justifie (« parce que… », « à mon avis… »). « Pas tout à fait » garde un ton respectueux.') },
      { id: 'b5-dialogue', type: 'dialogue', lines: LESSON_CONTENT[0].dialogue },
      { id: 'b5-phrases', type: 'phrases', phrases: LESSON_CONTENT[0].keyPhrases },
      { id: 'b5-listening', type: 'listening', assetId: 'aud-abidjan-meeting', instructions: L('A project lead in Abidjan proposes a delay. Listen, then answer.', 'Une cheffe de projet à Abidjan propose un report. Écoutez, puis répondez.'), questions: [q('b5-l1', 'Pourquoi propose-t-elle de reporter le lancement ?', ['Les partenaires ne sont pas prêts.', 'Le fournisseur n’a pas livré les emballages.', 'Le budget est épuisé.'], 1, 'The Lomé supplier has not delivered the packaging.', 'Le fournisseur de Lomé n’a pas livré les emballages.'), q('b5-l2', 'Quelle date reste possible selon le collègue ?', ['Novembre', 'Décembre', 'Janvier'], 1, '“Décembre reste possible.”', '« Décembre reste possible. »')] },
      { id: 'b5-quiz', type: 'quiz', questions: LESSON_CONTENT[0].quiz },
      { id: 'b5-assignment', type: 'assignment', prompt: LESSON_CONTENT[0].assignment, minWords: 10 },
    ],
  },
  'les-b4': {
    level: 'A2',
    objective: L('Take the floor in a meeting: open, give an update and hand over.', 'Prendre la parole en réunion : ouvrir, faire un point et passer la parole.'),
    blocks: (v) => [
      { id: 'b4-video', type: 'video', assetId: v },
      { id: 'b4-notes', type: 'notes', heading: 'Structurer une intervention', body: L('Open (“Si vous le permettez, je voudrais…”), give one update at a time (“D’abord… ensuite… enfin…”), then hand over (“Je laisse la parole à…”).', 'Ouvrez (« Si vous le permettez, je voudrais… »), faites un point à la fois (« D’abord… ensuite… enfin… »), puis passez la parole (« Je laisse la parole à… »).') },
      { id: 'b4-phrases', type: 'phrases', phrases: [{ fr: 'Si vous le permettez, je voudrais faire un point.', en: 'If I may, I would like to give an update.' }, { fr: 'D’abord… ensuite… enfin…', en: 'First… then… finally…' }, { fr: 'Je laisse la parole à Kofi.', en: 'I’ll hand over to Kofi.' }] },
      { id: 'b4-pron', type: 'pronunciation', focus: L('Liaisons make professional French sound fluent.', 'Les liaisons rendent le français professionnel plus fluide.'), items: [{ fr: 'Nous_avons un projet.', tip: L('Link the s as a z: “nou-za-von”.', 'Le s se prononce z : « nou-za-von ».'), assetId: 'aud-paris-liaison' }, { fr: 'Vous_êtes prêts ?', tip: L('“vou-zè”.', '« vou-zè ».') }, { fr: 'C’est_un excellent exemple.', tip: L('Link t → “sè-tun”.', 'Liaison en t : « sè-tun ».') }] },
      { id: 'b4-quiz', type: 'quiz', questions: [q('b4-q1', 'Pour demander la parole poliment, on dit :', ['Écoutez-moi !', 'Si vous le permettez, je voudrais ajouter quelque chose.', 'Attendez.'], 1, 'Conditional + “si vous le permettez” is polite.', 'Le conditionnel et « si vous le permettez » sont polis.'), q('b4-q2', '« Je laisse la parole à Ama » signifie…', ['I’m leaving Ama’s meeting.', 'I’ll hand over to Ama.', 'Ama is late.'], 1, 'To hand over to someone.', 'Passer la parole.')] },
      { id: 'b4-assign', type: 'assignment', prompt: L('Write a 4-sentence update for your team using “d’abord, ensuite, enfin”.', 'Rédigez un point d’équipe de 4 phrases avec « d’abord, ensuite, enfin ».'), minWords: 30 },
    ],
  },
  'les-e1': {
    level: 'A1',
    objective: L('Ask for and understand directions in a city.', 'Demander et comprendre son chemin en ville.'),
    blocks: (v) => [
      { id: 'e1-video', type: 'video', assetId: v },
      { id: 'e1-phrases', type: 'phrases', phrases: [{ fr: 'Excusez-moi, pour aller à… ?', en: 'Excuse me, how do I get to…?' }, { fr: 'Tout droit', en: 'Straight ahead' }, { fr: 'Tournez à gauche / à droite', en: 'Turn left / right' }, { fr: 'En face de', en: 'Opposite' }] },
      { id: 'e1-listening', type: 'listening', assetId: 'aud-dakar-directions', instructions: L('A visitor asks the way to Sandaga market in Dakar.', 'Un visiteur demande le chemin du marché Sandaga à Dakar.'), questions: [q('e1-l1', 'Après le rond-point, il faut tourner…', ['à droite', 'à gauche', 'nulle part'], 1, '“Vous tournez à gauche.”', '« Vous tournez à gauche. »'), q('e1-l2', 'Le marché est en face de…', ['la banque', 'la pharmacie', 'la gare'], 1, '“En face de la pharmacie.”', '« En face de la pharmacie. »')] },
      { id: 'e1-roleplay', type: 'roleplay', situation: L('You have just arrived in Cotonou and need to find your hotel.', 'Vous venez d’arriver à Cotonou et cherchez votre hôtel.'), learnerRole: L('Traveller', 'Voyageur'), partnerRole: L('Passer-by', 'Passant'), prompts: ['Excusez-moi, je cherche l’hôtel du Lac.', 'C’est loin d’ici ?', 'Je peux y aller à pied ?', 'Merci beaucoup, bonne journée !'] },
      { id: 'e1-quiz', type: 'quiz', questions: [q('e1-q1', '« Tout droit » signifie…', ['Turn around', 'Straight ahead', 'On the right'], 1, 'Straight ahead.', 'Sans tourner.')] },
    ],
  },
  'les-adv1': {
    level: 'C1',
    objective: L('Concede a point and qualify your argument without losing your position.', 'Concéder un point et nuancer son argument sans renoncer à sa position.'),
    blocks: (v) => [
      { id: 'adv1-video', type: 'video', assetId: v },
      { id: 'adv1-notes', type: 'notes', heading: 'Concéder pour mieux convaincre', body: L('At C1, persuasion relies on concession: acknowledge the other side (“certes”, “il est vrai que”), then reassert your view (“toutefois”, “il n’en demeure pas moins que”). Concessive clauses with “bien que” and “quoique” take the subjunctive.', 'Au niveau C1, convaincre passe par la concession : reconnaître le point de vue adverse (« certes », « il est vrai que »), puis réaffirmer le sien (« toutefois », « il n’en demeure pas moins que »). « Bien que » et « quoique » sont suivis du subjonctif.') },
      { id: 'adv1-phrases', type: 'phrases', phrases: [{ fr: 'Certes, …, mais il n’en demeure pas moins que…', en: 'Admittedly, …, but the fact remains that…' }, { fr: 'Force est de constater que…', en: 'One has to acknowledge that…' }, { fr: 'Sans pour autant remettre en cause…', en: 'Without, however, calling into question…' }, { fr: 'Il convient de nuancer ce propos.', en: 'This statement should be qualified.' }] },
      { id: 'adv1-quiz', type: 'quiz', questions: [
        q('adv1-q1', 'Complétez : « Quoique la mesure ___ coûteuse, elle reste indispensable. »', ['est', 'soit', 'sera'], 1, '“Quoique” always takes the subjunctive.', '« Quoique » est toujours suivi du subjonctif.'),
        q('adv1-q2', 'Quelle formule concède un point avant de le contester ?', ['Il est évident que vous avez tort.', 'Certes, l’argument est solide ; toutefois, il néglige le coût.', 'Je suis entièrement d’accord.'], 1, '“Certes … toutefois” acknowledges, then counters.', '« Certes … toutefois » concède, puis contre-argumente.'),
        q('adv1-q3', '« Force est de constater » signifie…', ['on est obligé de reconnaître', 'il faut utiliser la force', 'on refuse d’admettre'], 0, 'A formal way to say the facts leave no choice.', 'Tournure soutenue : les faits ne laissent pas le choix.'),
      ] },
      { id: 'adv1-assign', type: 'assignment', prompt: L('In 120–150 words, argue for or against a four-day working week. Include at least one concession.', 'En 120 à 150 mots, prenez position pour ou contre la semaine de quatre jours. Intégrez au moins une concession.'), minWords: 120 },
    ],
  },
  'les-c1': {
    level: 'A1',
    objective: L('Greet people and introduce yourself and a colleague.', 'Saluer et se présenter, présenter un collègue.'),
    blocks: (v) => [
      { id: 'c1-video', type: 'video', assetId: v },
      { id: 'c1-notes', type: 'notes', heading: 'Tu ou vous ?', body: L('Use “vous” with people you meet at work or for the first time, and “tu” with friends. When in doubt, choose “vous”.', 'On utilise « vous » au travail et avec les inconnus, « tu » entre amis. Dans le doute, choisissez « vous ».') },
      { id: 'c1-listening', type: 'listening', assetId: 'aud-lome-greetings', instructions: L('A colleague in Lomé introduces Kofi.', 'Une collègue à Lomé présente Kofi.'), questions: [q('c1-l1', 'D’où vient Kofi ?', ['De Lomé', 'D’Accra', 'De Dakar'], 1, '“Notre nouveau collègue d’Accra.”', '« Notre nouveau collègue d’Accra. »')] },
      { id: 'c1-listening2', type: 'listening', assetId: 'aud-yaounde-intro', instructions: L('Brice introduces himself (Cameroonian accent).', 'Brice se présente (accent camerounais).'), questions: [q('c1-l2', 'Quel est le métier de Brice ?', ['Professeur', 'Ingénieur', 'Médecin'], 1, '“Je suis ingénieur.”', '« Je suis ingénieur. »')] },
      { id: 'c1-pron', type: 'pronunciation', focus: L('Nasal sounds in common greetings.', 'Les voyelles nasales des salutations.'), items: [{ fr: 'Bonjour', tip: L('“bon” is nasal: don’t pronounce the n.', '« bon » est nasal : on ne prononce pas le n.') }, { fr: 'Enchanté', tip: L('Two nasal sounds: “an-shan-té”.', 'Deux nasales : « an-chan-té ».') }] },
      { id: 'c1-quiz', type: 'quiz', questions: [q('c1-q1', 'Avec un nouveau client, on dit :', ['Salut, ça va ?', 'Bonjour madame, enchanté.', 'Coucou !'], 1, 'Formal register with a client.', 'Registre formel avec un client.')] },
    ],
  },
};

function seedLessons(): { lessons: LessonDoc[]; media: MediaAsset[] } {
  const lessons: LessonDoc[] = [];
  const media: MediaAsset[] = [...SEED_AUDIO];
  for (const course of COURSES) {
    const baseLevel = course.levels.slice(0, 2) as CefrLevel;
    course.modules.forEach((m, mi) =>
      m.lessons.forEach((ref, pi) => {
        const videoId = `vid-${ref.id}`;
        media.push({ id: videoId, kind: 'video', title: `Introduction : ${ref.title}`, durationSec: ref.videoSec ?? 300, speaker: TUTORS.find((t) => t.id === course.tutorId)?.name, url: null, uploadedBy: course.tutorId, uploadedAt: SEED_AT });
        const rich = RICH[ref.id];
        const status: ContentStatus = rich ? 'published' : ref.id === 'les-b6' ? 'in-review' : 'draft';
        const blocks: Block[] = rich
          ? rich.blocks(videoId)
          : ref.id === 'les-b6'
            ? [
                { id: 'b6-video', type: 'video', assetId: videoId },
                { id: 'b6-notes', type: 'notes', heading: 'Le compte rendu', body: L('A meeting report lists the date, participants, decisions and next actions, in the present or passé composé.', 'Un compte rendu indique la date, les participants, les décisions et les prochaines actions, au présent ou au passé composé.') },
                { id: 'b6-assign', type: 'assignment', prompt: L('Write a 6-line report of your last team meeting.', 'Rédigez un compte rendu de 6 lignes de votre dernière réunion.'), minWords: 50 },
              ]
            : [{ id: `${ref.id}-video`, type: 'video', assetId: videoId }];
        lessons.push({
          id: ref.id,
          courseId: course.id,
          moduleIndex: mi,
          position: pi,
          title: ref.title,
          level: rich?.level ?? baseLevel,
          kind: ref.kind,
          minutes: ref.minutes,
          objective: rich?.objective ?? (ref.id === 'les-b6' ? L('Write a short, structured meeting report.', 'Rédiger un compte rendu de réunion court et structuré.') : L('', '')),
          blocks,
          status,
          version: 1,
          authorId: course.tutorId,
          updatedBy: course.tutorId,
          updatedAt: SEED_AT,
          ...(status === 'published' ? { publishedAt: SEED_AT } : {}),
          history: [{ at: SEED_AT, by: course.tutorId, action: status === 'published' ? 'published' : status === 'in-review' ? 'submitted' : 'created' }],
        });
      }),
    );
  }
  return { lessons, media };
}

const SEED_PACKS: ImmersionPack[] = [
  { id: 'pk-lome-supplier', kind: 'roleplay', theme: 'negotiation', level: 'B1', title: L('Negotiate with a supplier in Lomé', 'Négocier avec un fournisseur à Lomé'), brief: L('You need a better price and a firm delivery date for 2,000 units. Your tutor plays the supplier.', 'Vous voulez un meilleur prix et une date de livraison ferme pour 2 000 unités. Votre tuteur joue le fournisseur.'), prompts: ['Présentez votre entreprise et votre besoin.', 'Proposez un prix inférieur et justifiez-le.', 'Acceptez à une condition : « à condition que… ».', 'Confirmez l’accord et les prochaines étapes.'], vocabulary: [{ fr: 'un devis', en: 'a quote' }, { fr: 'un délai de livraison', en: 'a delivery time' }, { fr: 'à condition que', en: 'provided that' }], authorId: 'tut-thomas', updatedAt: SEED_AT },
  { id: 'pk-committee-pitch', kind: 'roleplay', theme: 'presentations', level: 'B1', title: L('Present a project to a committee', 'Présenter un projet à un comité'), brief: L('Three-minute pitch, then two questions from the committee.', 'Présentation de trois minutes, puis deux questions du comité.'), prompts: ['Annoncez le plan de votre présentation.', 'Présentez l’objectif et le budget.', 'Répondez : « Pourquoi maintenant ? »', 'Concluez et remerciez le comité.'], vocabulary: [{ fr: 'l’ordre du jour', en: 'the agenda' }, { fr: 'un échéancier', en: 'a timeline' }], authorId: 'tut-sophie', updatedAt: SEED_AT },
  { id: 'pk-smalltalk', kind: 'prompts', theme: 'meetings', level: 'A2', title: L('Small talk before a meeting', 'Petite conversation avant une réunion'), brief: L('Warm-up questions for the first five minutes of a session.', 'Questions d’échauffement pour les cinq premières minutes.'), prompts: ['Comment s’est passé votre voyage ?', 'Vous travaillez sur quel projet en ce moment ?', 'Qu’avez-vous fait ce week-end ?', 'Vous connaissez déjà Abidjan ?'], vocabulary: [{ fr: 'Ça fait longtemps !', en: 'Long time no see!' }], authorId: 'tut-sophie', updatedAt: SEED_AT },
  { id: 'pk-dakar-arrival', kind: 'prompts', theme: 'travel', level: 'A2', title: L('Arriving in Dakar for work', 'Arriver à Dakar pour le travail'), brief: L('Airport, taxi and hotel check-in, in that order.', 'Aéroport, taxi et hôtel, dans cet ordre.'), prompts: ['À l’aéroport : demandez où récupérer vos bagages.', 'Dans le taxi : donnez l’adresse et négociez le prix.', 'À l’hôtel : confirmez votre réservation de trois nuits.'], vocabulary: [{ fr: 'la réception', en: 'front desk' }, { fr: 'C’est combien pour aller à… ?', en: 'How much to go to…?' }], authorId: 'tut-aicha', updatedAt: SEED_AT },
  { id: 'pk-logistics-bank', kind: 'vocabulary', theme: 'negotiation', level: 'B1', title: L('Personal vocabulary bank: logistics', 'Banque de vocabulaire : logistique'), brief: L('Words Chinedu needs for his Benin expansion. Use each in a sentence about your own business.', 'Le vocabulaire dont Chinedu a besoin pour le Bénin. Employez chaque mot dans une phrase sur votre activité.'), prompts: ['Utilisez « dédouaner » dans une phrase.', 'Expliquez un retard avec « en raison de ».', 'Décrivez votre entrepôt.'], vocabulary: [{ fr: 'dédouaner', en: 'to clear customs' }, { fr: 'un entrepôt', en: 'a warehouse' }, { fr: 'en raison de', en: 'due to' }, { fr: 'un transporteur', en: 'a carrier' }], authorId: 'tut-thomas', updatedAt: SEED_AT },
  { id: 'pk-reformulate', kind: 'exercise', theme: 'meetings', level: 'A2', title: L('Rephrase it politely', 'Reformuler poliment'), brief: L('Rewrite each blunt sentence so it works in a meeting.', 'Réécrivez chaque phrase trop directe pour une réunion.'), prompts: ['« C’est faux. »', '« Je veux le rapport demain. »', '« Votre idée ne marche pas. »'], vocabulary: [{ fr: 'Il me semble que…', en: 'It seems to me that…' }, { fr: 'Pourriez-vous… ?', en: 'Could you…?' }], authorId: 'tut-sophie', updatedAt: SEED_AT },
];

const SEED_ASSIGNMENTS: PackAssignment[] = [
  { id: 'as-1001', packId: 'pk-smalltalk', learnerId: 'lrn-ama', tutorId: 'tut-sophie', note: 'Prepare two answers for each question before Tuesday’s session. Think about your Lomé call.', dueOn: '2026-10-27', assignedAt: '2026-10-24T10:00:00Z', status: 'assigned' },
  { id: 'as-1002', packId: 'pk-reformulate', learnerId: 'lrn-ama', tutorId: 'tut-sophie', note: 'Quick written warm-up.', assignedAt: '2026-10-18T10:00:00Z', status: 'reviewed', response: 'Il me semble que ce chiffre n’est pas tout à fait exact. Pourriez-vous m’envoyer le rapport demain ? Je ne suis pas sûre que cette idée fonctionne pour nous.', submittedAt: '2026-10-19T18:20:00Z', feedback: 'Très bien, Ama ! « Il me semble que » est parfait. Pour la 3e phrase, essayez « Je me demande si cette idée est adaptée à notre contexte » : plus nuancé.', reviewedAt: '2026-10-20T09:00:00Z' },
  { id: 'as-1003', packId: 'pk-lome-supplier', learnerId: 'lrn-adwoa', tutorId: 'tut-thomas', note: 'Write your opening offer before our role play.', assignedAt: '2026-10-22T10:00:00Z', status: 'submitted', response: 'Bonjour, je représente Darko Textiles. Nous voulons 2 000 unités. Votre prix est un peu élevé pour nous, nous proposons 10 % de moins si la livraison est avant le 15 novembre.', submittedAt: '2026-10-24T20:05:00Z' },
];

/** Lessons, media, packs and progress; community.ts adds cohorts, follows and rewards. */
export function seedContentBase(): Omit<ContentState, 'cohorts' | 'follows' | 'tokens' | 'leaderboardOptOut' | 'reports' | 'kids' | 'kidActivities' | 'externalGames'> {
  const { lessons, media } = seedLessons();
  return shiftDatesInPlace({
    lessons,
    media,
    packs: structuredClone(SEED_PACKS),
    assignments: structuredClone(SEED_ASSIGNMENTS),
    editors: { 'crs-business': ['tut-jeanmarc'] },
    completions: [{ learnerId: 'lrn-ama', lessonId: 'les-b4', at: '2026-10-22T19:00:00Z', quizScore: { correct: 2, total: 2 } }],
    placements: [],
    rewards: [],
  });
}
