// Cohorts, group assignments, following classmates, leaderboard, reward levels/tokens,
// session purposes and the daily phrase. Pure functions shared by the API and the offline adapter.
import { ContentError, pointsFor, registerTokenGranter, seedContentBase, type ContentState, type ContentUser, type RewardClaim } from './content';
import { SEED_SHIFT_DAYS, shiftDatesInPlace, shiftIso, weekendNudge, weeklySchedule } from './clock';
import { LEARNERS, TUTORS } from './demo-data';
import { seedKids } from './kids';
import { seedCafe } from './cafe';
import type { ReviewDay, VocabReview } from './review';
import type { Booking, CefrLevel, Localized } from './types';

const L = (en: string, fr: string): Localized => ({ en, fr });
const fail = (status: number, code: string, message: string): never => {
  throw new ContentError(status, code, message);
};
type Ctx = { user: ContentUser; now: string; newId: (prefix: string) => string };

/* ---------- Sessions: purpose and price (client calls) ---------- */

export type SessionPurpose = 'conversation' | 'course-help' | 'catch-up';

export const SESSION_PURPOSES: Record<SessionPurpose, { title: Localized; body: Localized }> = {
  conversation: { title: L('French-only conversation', 'Conversation en français'), body: L('Speak with a tutor about your work and life, with live corrections.', 'Parlez de votre travail et de votre vie avec un tuteur, qui vous corrige en direct.') },
  'course-help': { title: L('Questions on course content', 'Questions sur le cours'), body: L('Go through a lesson or material you found difficult.', 'Revoyez une leçon ou un support difficile.') },
  'catch-up': { title: L('Catch up on a missed group class', 'Rattraper une classe manquée'), body: L('A private session covering what your group did. Group classes are not recorded.', 'Une séance individuelle sur ce que votre groupe a vu. Les classes ne sont pas enregistrées.') },
};

/** Every learner's first one-on-one conversation is free; other private sessions cost one credit. */
export function sessionCost(bookings: Booking[], learnerId: string, purpose: SessionPurpose) {
  const usedFree = bookings.some((b) => b.learnerId === learnerId && b.freeIntro && b.status !== 'cancelled');
  const freeIntro = purpose === 'conversation' && !usedFree;
  return { credits: freeIntro ? 0 : 1, freeIntro };
}

/* ---------- Cohorts ---------- */

export const COHORT_CAPACITY = 5;

export interface CohortSession {
  id: string;
  start: string;
  durationMin: number;
  topic: string;
  /** null until the tutor takes attendance. */
  attended: string[] | null;
}

export interface GroupAssignment {
  id: string;
  title: string;
  prompt: Localized;
  dueOn?: string;
  postedAt: string;
  responses: { learnerId: string; text: string; at: string }[];
  /** When on, members see each other's answers after sending their own. Off by default: instructor only. */
  shareAnswers?: boolean;
}

export interface Cohort {
  id: string;
  name: Localized;
  courseId: string;
  tutorId: string;
  level: CefrLevel;
  schedule: Localized;
  memberIds: string[];
  sessions: CohortSession[];
  assignments: GroupAssignment[];
}

/** Sessions a member missed (attendance taken, not present) — eligible for a paid catch-up. */
export function missedSessions(cohort: Cohort, learnerId: string, now: string) {
  return cohort.sessions.filter((s) => s.start < now && s.attended !== null && !s.attended.includes(learnerId));
}

export interface Follow {
  followerId: string;
  followeeId: string;
  at: string;
}

/* ---------- Who can contact whom ---------- */

/**
 * Classmates: learners in the same group, or studying at the same CEFR level.
 * Classmates can text and call each other by default; anyone else needs a follow first.
 */
export function isClassmate(state: ContentState, a: string, b: string) {
  if (a === b) return false;
  const la = LEARNERS.find((l) => l.id === a);
  const lb = LEARNERS.find((l) => l.id === b);
  if (!la || !lb) return false;
  return state.cohorts.some((g) => g.memberIds.includes(a) && g.memberIds.includes(b)) || la.level === lb.level;
}

export function canContact(state: ContentState, from: string, to: string) {
  if (!from.startsWith('lrn-') || !to.startsWith('lrn-') || from === to) return false;
  return isClassmate(state, from, to) || state.follows.some((f) => f.followerId === from && f.followeeId === to);
}

export const classmatesOf = (state: ContentState, id: string) => LEARNERS.filter((l) => isClassmate(state, id, l.id));

/* ---------- Rewards: levels unlock tokens (client calls) ---------- */

export const REWARD_LEVELS = [
  { id: 'bronze', min: 0, name: L('Bronze', 'Bronze'), unlock: null },
  { id: 'silver', min: 50, name: L('Silver', 'Argent'), unlock: { kind: 'discount', value: 5, label: L('5% off your next renewal', '5 % sur votre prochain renouvellement') } },
  { id: 'gold', min: 150, name: L('Gold', 'Or'), unlock: { kind: 'session-credit', value: 1, label: L('1 free private session credit', '1 crédit de séance privée offert') } },
  { id: 'platinum', min: 300, name: L('Platinum', 'Platine'), unlock: { kind: 'discount', value: 15, label: L('15% off your next renewal', '15 % sur votre prochain renouvellement') } },
] as const;
export type RewardLevelId = (typeof REWARD_LEVELS)[number]['id'];

export interface RewardToken {
  id: string;
  learnerId: string;
  levelId: RewardLevelId;
  kind: 'discount' | 'session-credit';
  value: number;
  label: Localized;
  unlockedAt: string;
  redeemedAt?: string;
}

export function levelFor(points: number) {
  const reached = REWARD_LEVELS.filter((l) => points >= l.min);
  const current = reached[reached.length - 1];
  const next = REWARD_LEVELS.find((l) => l.min > points);
  return { current, next, toNext: next ? next.min - points : 0 };
}

/** Grants the tokens for every level reached and not yet rewarded. */
export function grantLevelTokens(state: ContentState, learnerId: string, ctx: Pick<Ctx, 'now' | 'newId'>): ContentState {
  const points = pointsFor(state, learnerId);
  const have = new Set(state.tokens.filter((t) => t.learnerId === learnerId).map((t) => t.levelId));
  const grants: RewardToken[] = REWARD_LEVELS.filter((l) => l.unlock && points >= l.min && !have.has(l.id)).map((l) => ({
    id: ctx.newId('tok'),
    learnerId,
    levelId: l.id,
    kind: l.unlock!.kind,
    value: l.unlock!.value,
    label: l.unlock!.label,
    unlockedAt: ctx.now,
  }));
  return grants.length ? { ...state, tokens: [...state.tokens, ...grants] } : state;
}

registerTokenGranter(grantLevelTokens);

/* ---------- Leaderboard ---------- */

export interface LeaderboardRow {
  learnerId: string;
  points: number;
  rank: number;
}

/** Ranks learners by points (all time or since a date). Opted-out learners are hidden from others. */
export function leaderboard(state: ContentState, opts: { since?: string; ids?: string[]; viewerId?: string } = {}): LeaderboardRow[] {
  const ids = opts.ids ?? LEARNERS.map((l) => l.id);
  const sum = (id: string) => state.rewards.filter((r) => r.learnerId === id && (!opts.since || r.at >= opts.since)).reduce((n, r) => n + r.points, 0);
  const rows = ids
    .filter((id) => id === opts.viewerId || !state.leaderboardOptOut.includes(id))
    .map((id) => ({ learnerId: id, points: sum(id) }))
    .sort((a, b) => b.points - a.points || a.learnerId.localeCompare(b.learnerId));
  let rank = 0;
  let last = Number.NaN;
  return rows.map((r, i) => {
    if (r.points !== last) rank = i + 1;
    last = r.points;
    return { ...r, rank };
  });
}

/* ---------- Daily phrase ---------- */

export const DAILY_PHRASES: { fr: string; en: string; context: Localized }[] = [
  { fr: 'Je vous tiens au courant.', en: 'I’ll keep you posted.', context: L('Closing an email or a call', 'Pour conclure un courriel ou un appel') },
  { fr: 'On fait le point demain ?', en: 'Shall we catch up tomorrow?', context: L('Proposing a follow-up', 'Proposer un suivi') },
  { fr: 'Ça marche pour moi.', en: 'That works for me.', context: L('Agreeing to a time', 'Accepter un horaire') },
  { fr: 'Pourriez-vous répéter, s’il vous plaît ?', en: 'Could you repeat that, please?', context: L('In a meeting or on the phone', 'En réunion ou au téléphone') },
  { fr: 'Je reviens vers vous dès que possible.', en: 'I’ll get back to you as soon as possible.', context: L('Buying time politely', 'Gagner du temps poliment') },
  { fr: 'C’est noté.', en: 'Noted.', context: L('Confirming you understood', 'Confirmer que vous avez compris') },
  { fr: 'Il me semble que…', en: 'It seems to me that…', context: L('Softening an opinion', 'Nuancer un avis') },
  { fr: 'Bonne continuation !', en: 'All the best going forward!', context: L('Friendly sign-off, very common in West Africa', 'Formule amicale, très courante en Afrique de l’Ouest') },
  { fr: 'Ça va aller.', en: 'It’ll be fine.', context: L('Reassuring someone', 'Rassurer quelqu’un') },
  { fr: 'On se dit à demain.', en: 'See you tomorrow, then.', context: L('Ending a conversation', 'Terminer une conversation') },
  { fr: 'Quel est l’ordre du jour ?', en: 'What’s on the agenda?', context: L('Starting a meeting', 'Ouvrir une réunion') },
  { fr: 'Je suis à votre disposition.', en: 'I’m at your disposal.', context: L('Offering help, formal', 'Proposer son aide, registre formel') },
  { fr: 'Ça fait longtemps !', en: 'Long time no see!', context: L('Greeting a colleague', 'Saluer un collègue') },
  { fr: 'Vous avez tout à fait raison.', en: 'You’re absolutely right.', context: L('Agreeing strongly', 'Être tout à fait d’accord') },
];

export function phraseOfDay(isoDate: string) {
  const day = Math.floor(Date.UTC(+isoDate.slice(0, 4), +isoDate.slice(5, 7) - 1, +isoDate.slice(8, 10)) / 86_400_000);
  return DAILY_PHRASES[day % DAILY_PHRASES.length];
}

/* ---------- Operations ---------- */

const findCohort = (s: ContentState, id: string) => s.cohorts.find((c) => c.id === id) ?? fail(404, 'not_found', 'Group not found');
const isStaffOf = (user: ContentUser, c: Cohort) => user.role === 'admin' || (user.role === 'instructor' && c.tutorId === user.id);

export const communityOps = {
  joinCohort(state: ContentState, ctx: Ctx, cohortId: string) {
    if (ctx.user.role !== 'learner') fail(403, 'forbidden', 'Only learners join groups.');
    const next = structuredClone(state);
    const c = findCohort(next, cohortId);
    if (c.memberIds.includes(ctx.user.id)) fail(409, 'already_member', 'You are already in this group.');
    if (c.memberIds.length >= COHORT_CAPACITY) fail(409, 'cohort_full', `This group is full (${COHORT_CAPACITY} learners maximum).`);
    if (next.cohorts.some((x) => x.courseId === c.courseId && x.memberIds.includes(ctx.user.id))) fail(409, 'one_group_per_course', 'You are already in a group for this course.');
    c.memberIds.push(ctx.user.id);
    return { state: next, cohort: c };
  },

  leaveCohort(state: ContentState, ctx: Ctx, cohortId: string) {
    const next = structuredClone(state);
    const c = findCohort(next, cohortId);
    if (!c.memberIds.includes(ctx.user.id)) fail(409, 'not_member', 'You are not in this group.');
    c.memberIds = c.memberIds.filter((id) => id !== ctx.user.id);
    return { state: next, cohort: c };
  },

  createCohort(state: ContentState, ctx: Ctx, input: Pick<Cohort, 'name' | 'courseId' | 'tutorId' | 'level' | 'schedule'>) {
    if (ctx.user.role !== 'admin') fail(403, 'forbidden', 'Only administrators create groups.');
    if (!TUTORS.some((t) => t.id === input.tutorId)) fail(422, 'unknown_tutor', 'Choose an instructor.');
    const next = structuredClone(state);
    const cohort: Cohort = { ...input, id: ctx.newId('coh'), memberIds: [], sessions: [], assignments: [] };
    next.cohorts.push(cohort);
    return { state: next, cohort };
  },

  scheduleSession(state: ContentState, ctx: Ctx, cohortId: string, input: Pick<CohortSession, 'start' | 'durationMin' | 'topic'>) {
    const next = structuredClone(state);
    const c = findCohort(next, cohortId);
    if (!isStaffOf(ctx.user, c)) fail(403, 'forbidden', 'Only the group’s instructor can schedule sessions.');
    c.sessions.push({ ...input, id: ctx.newId('cs'), attended: null });
    c.sessions.sort((a, b) => a.start.localeCompare(b.start));
    return { state: next, cohort: c };
  },

  /** The instructor records who attended; absentees can then book a paid catch-up. */
  takeAttendance(state: ContentState, ctx: Ctx, cohortId: string, sessionId: string, attended: string[]) {
    const next = structuredClone(state);
    const c = findCohort(next, cohortId);
    if (!isStaffOf(ctx.user, c)) fail(403, 'forbidden', 'Only the group’s instructor takes attendance.');
    const s = c.sessions.find((x) => x.id === sessionId) ?? fail(404, 'not_found', 'Session not found');
    if (s.start > ctx.now) fail(409, 'not_started', 'Attendance opens once the session has started.');
    s.attended = attended.filter((id) => c.memberIds.includes(id));
    return { state: next, cohort: c };
  },

  postGroupAssignment(state: ContentState, ctx: Ctx, cohortId: string, input: Pick<GroupAssignment, 'title' | 'prompt' | 'dueOn'>) {
    const next = structuredClone(state);
    const c = findCohort(next, cohortId);
    if (!isStaffOf(ctx.user, c)) fail(403, 'forbidden', 'Only the group’s instructor can post assignments.');
    if (!input.title.trim() || !input.prompt.en.trim()) fail(422, 'invalid_assignment', 'Give the assignment a title and instructions.');
    const assignment: GroupAssignment = { ...input, id: ctx.newId('ga'), postedAt: ctx.now, responses: [] };
    c.assignments.unshift(assignment);
    return { state: next, cohort: c };
  },

  setAnswerSharing(state: ContentState, ctx: Ctx, cohortId: string, assignmentId: string, share: boolean) {
    const next = structuredClone(state);
    const c = findCohort(next, cohortId);
    if (!isStaffOf(ctx.user, c)) fail(403, 'forbidden', 'Only the group’s instructor can change who sees answers.');
    const a = c.assignments.find((x) => x.id === assignmentId) ?? fail(404, 'not_found', 'Assignment not found');
    a.shareAnswers = share;
    return { state: next, cohort: c };
  },

  respondGroupAssignment(state: ContentState, ctx: Ctx, cohortId: string, assignmentId: string, text: string) {
    const next = structuredClone(state);
    const c = findCohort(next, cohortId);
    if (!c.memberIds.includes(ctx.user.id)) fail(403, 'forbidden', 'Only group members can answer.');
    const a = c.assignments.find((x) => x.id === assignmentId) ?? fail(404, 'not_found', 'Assignment not found');
    if (text.trim().split(/\s+/).length < 5) fail(422, 'too_short', 'Write at least a few sentences.');
    a.responses = [...a.responses.filter((r) => r.learnerId !== ctx.user.id), { learnerId: ctx.user.id, text, at: ctx.now }];
    return { state: next, cohort: c };
  },

  follow(state: ContentState, ctx: Ctx, learnerId: string, on: boolean) {
    if (ctx.user.role !== 'learner') fail(403, 'forbidden', 'Only learners follow classmates.');
    if (learnerId === ctx.user.id) fail(422, 'self_follow', 'You cannot follow yourself.');
    if (!LEARNERS.some((l) => l.id === learnerId)) fail(404, 'not_found', 'Learner not found');
    const next = structuredClone(state);
    next.follows = next.follows.filter((f) => !(f.followerId === ctx.user.id && f.followeeId === learnerId));
    if (on) next.follows.push({ followerId: ctx.user.id, followeeId: learnerId, at: ctx.now });
    return { state: next };
  },

  setLeaderboardVisibility(state: ContentState, ctx: Ctx, visible: boolean) {
    if (ctx.user.role !== 'learner') fail(403, 'forbidden', 'Only learners appear on the leaderboard.');
    const next = structuredClone(state);
    next.leaderboardOptOut = next.leaderboardOptOut.filter((id) => id !== ctx.user.id);
    if (!visible) next.leaderboardOptOut.push(ctx.user.id);
    return { state: next };
  },

  /** Session-credit tokens add a credit (the caller applies it to the learner record); discounts apply at checkout. */
  redeemToken(state: ContentState, ctx: Ctx, tokenId: string) {
    const next = structuredClone(state);
    const t = next.tokens.find((x) => x.id === tokenId) ?? fail(404, 'not_found', 'Reward not found');
    if (t.learnerId !== ctx.user.id) fail(403, 'forbidden', 'This reward belongs to someone else.');
    if (t.redeemedAt) fail(409, 'already_redeemed', 'You have already used this reward.');
    t.redeemedAt = ctx.now;
    return { state: next, token: t };
  },
};

/* ---------- Seed ---------- */

const SEED_AT = '2026-10-01T09:00:00Z';

const SEED_COHORTS: Cohort[] = [
  {
    id: 'coh-biz-a2',
    name: L('Business French A2 · October group', 'Français des affaires A2 · groupe d’octobre'),
    courseId: 'crs-business',
    tutorId: 'tut-sophie',
    level: 'A2',
    schedule: L('Thursdays 18:00 GMT · 60 min on Google Meet', 'Le jeudi 18 h GMT · 60 min sur Google Meet'),
    memberIds: ['lrn-ama', 'lrn-adwoa', 'lrn-grace'],
    sessions: [
      { id: 'cs-b1', start: '2026-10-15T18:00:00Z', durationMin: 60, topic: 'Se présenter en réunion', attended: ['lrn-ama', 'lrn-adwoa', 'lrn-grace'] },
      { id: 'cs-b2', start: '2026-10-22T18:00:00Z', durationMin: 60, topic: 'Prendre la parole', attended: ['lrn-adwoa', 'lrn-grace'] },
      { id: 'cs-b3', start: '2026-10-29T18:00:00Z', durationMin: 60, topic: 'Exprimer son accord ou son désaccord', attended: null },
      { id: 'cs-b4', start: '2026-11-05T18:00:00Z', durationMin: 60, topic: 'Compte rendu de réunion', attended: null },
    ],
    assignments: [
      {
        id: 'ga-agenda',
        title: 'Préparer l’ordre du jour',
        prompt: L('Write a 5-point agenda for a project meeting with partners in Lomé, then one sentence to open the meeting.', 'Rédigez un ordre du jour en 5 points pour une réunion de projet avec des partenaires à Lomé, puis une phrase pour ouvrir la réunion.'),
        dueOn: '2026-10-28',
        postedAt: '2026-10-22T19:10:00Z',
        responses: [
          { learnerId: 'lrn-adwoa', text: '1. Bienvenue 2. Point sur les livraisons 3. Prix 4. Calendrier 5. Questions. Bonjour à tous, merci d’être là, commençons par un tour de table.', at: '2026-10-24T08:30:00Z' },
          { learnerId: 'lrn-grace', text: '1. Présentations 2. Objectifs du programme 3. Budget 4. Prochaines étapes 5. Divers. Bonjour, je vous propose de commencer par les objectifs.', at: '2026-10-25T17:45:00Z' },
        ],
      },
    ],
  },
  {
    id: 'coh-conv-a1',
    name: L('Confident Conversation A1 · Evening group', 'Converser avec aisance A1 · groupe du soir'),
    courseId: 'crs-conversation',
    tutorId: 'tut-aicha',
    level: 'A1',
    schedule: L('Tuesdays 19:00 GMT · 45 min on Google Meet', 'Le mardi 19 h GMT · 45 min sur Google Meet'),
    memberIds: ['lrn-efua', 'lrn-samuel'],
    sessions: [
      { id: 'cs-c1', start: '2026-10-20T19:00:00Z', durationMin: 45, topic: 'Les salutations', attended: ['lrn-efua'] },
      { id: 'cs-c2', start: '2026-10-27T19:00:00Z', durationMin: 45, topic: 'Poser des questions simples', attended: null },
    ],
    assignments: [],
  },
  {
    id: 'coh-dipl-b1',
    name: L('French for Diplomacy B1 · Saturday group', 'Français de la diplomatie B1 · groupe du samedi'),
    courseId: 'crs-diplomacy',
    tutorId: 'tut-jeanmarc',
    level: 'B1',
    schedule: L('Saturdays 10:00 GMT · 60 min on Google Meet', 'Le samedi 10 h GMT · 60 min sur Google Meet'),
    memberIds: ['lrn-kofi'],
    sessions: [{ id: 'cs-d1', start: '2026-10-31T10:00:00Z', durationMin: 60, topic: 'Les formules de politesse officielles', attended: null }],
    assignments: [],
  },
];

/** Classmates' points come from the same reward ledger as everyone's (seeded demo history). */
function seedRewards(): RewardClaim[] {
  const history: [string, number][] = [['lrn-yaw', 4], ['lrn-kofi', 3], ['lrn-chinedu', 3], ['lrn-grace', 2], ['lrn-adwoa', 1], ['lrn-efua', 1]];
  const quests = ['streak-5', 'quiz-ace-3', 'lessons-2', 'practice-1'] as const;
  const pts = { 'streak-5': 5, 'quiz-ace-3': 15, 'lessons-2': 10, 'practice-1': 10 } as const;
  const out: RewardClaim[] = [];
  history.forEach(([learnerId, weeks]) => {
    for (let w = 0; w < weeks; w++) {
      const week = new Date(Date.UTC(2026, 9, 19 - w * 7)).toISOString().slice(0, 10);
      quests.slice(0, 2 + ((w + learnerId.length) % 3)).forEach((q) => out.push({ learnerId, questId: q, week, points: pts[q], at: `${week}T18:00:00Z` }));
    }
  });
  return out;
}

export function seedContent(): ContentState {
  const cohorts = shiftDatesInPlace(structuredClone(SEED_COHORTS));
  for (const g of cohorts) {
    // Keep each group on one weekday, off the weekend.
    const nudge = SEED_SHIFT_DAYS && g.sessions[0] ? weekendNudge(g.sessions[0].start) : 0;
    if (nudge) for (const s of g.sessions) s.start = shiftIso(s.start, nudge);
  }
  for (const g of cohorts) if (g.sessions[0]) g.schedule = weeklySchedule(g.sessions[0].start, g.sessions[0].durationMin);
  return {
    ...seedContentBase(),
    cohorts,
    reports: [],
    ...seedKids(),
    ...seedReviews(),
    cafe: seedCafe(),
    follows: shiftDatesInPlace([
      { followerId: 'lrn-ama', followeeId: 'lrn-adwoa', at: SEED_AT },
      { followerId: 'lrn-adwoa', followeeId: 'lrn-ama', at: SEED_AT },
      { followerId: 'lrn-grace', followeeId: 'lrn-ama', at: SEED_AT },
    ]),
    rewards: shiftDatesInPlace(seedRewards()),
    tokens: [],
    leaderboardOptOut: ['lrn-samuel'],
  };
}


/** Demo: Ama has reviewed for three days running; two words are due again today. */
function seedReviews(): { vocabReviews: VocabReview[]; reviewDays: ReviewDay[] } {
  const d = (iso: string) => shiftIso(iso, SEED_SHIFT_DAYS);
  const r = (vocabId: string, box: number, dueOn: string): VocabReview => ({ learnerId: 'lrn-ama', vocabId, box, dueOn: d(dueOn), reps: box + 1, lapses: 0, lastAt: d('2026-10-25T08:30:00Z') });
  return {
    vocabReviews: [r('v1', 1, '2026-10-26'), r('v2', 2, '2026-10-26'), r('v3', 3, '2026-11-01')],
    reviewDays: ['2026-10-23', '2026-10-24', '2026-10-25'].map((day) => ({ learnerId: 'lrn-ama', day: d(day), count: 6 })),
  };
}
