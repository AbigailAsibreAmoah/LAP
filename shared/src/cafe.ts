// Le Café La Porte: a calm community for learners. Topic spaces made by La Porte, text posts with
// automatic links, comments, emoji reactions, saved posts, a weekly challenge and study groups.
// Members only (never children). Names are shown (first name + level), never anonymous.
import { shiftDatesInPlace } from './clock';
import { ContentError, type ContentState, type ContentUser } from './content';
import { findContactDetails } from './policies';
import type { CefrLevel, Localized } from './types';

const L = (en: string, fr: string): Localized => ({ en, fr });
type Ctx = { user: ContentUser; now: string; newId: (prefix: string) => string };
const fail = (status: number, code: string, message: string): never => {
  throw new ContentError(status, code, message);
};

/* ---------------- Spaces (created by La Porte) ---------------- */

export interface CafeSpace {
  id: string;
  name: Localized;
  emoji: string;
  about: Localized;
  group: 'level' | 'goal' | 'open';
}

export const CAFE_SPACES: CafeSpace[] = [
  { id: 'sp-a', name: L('A1–A2 · Beginners', 'A1–A2 · Débutants'), emoji: '🌱', about: L('First steps, simple questions, no judgement.', 'Premiers pas, questions simples, sans jugement.'), group: 'level' },
  { id: 'sp-b', name: L('B1–B2 · Intermediate', 'B1–B2 · Intermédiaires'), emoji: '🌿', about: L('Explain, argue, tell stories.', 'Expliquer, argumenter, raconter.'), group: 'level' },
  { id: 'sp-c', name: L('C1–C2 · Advanced', 'C1–C2 · Avancés'), emoji: '🌳', about: L('Nuance, style and specialist topics.', 'Nuance, style et sujets spécialisés.'), group: 'level' },
  { id: 'sp-business', name: L('Business French', 'Français des affaires'), emoji: '💼', about: L('Meetings, emails, negotiation.', 'Réunions, e-mails, négociation.'), group: 'goal' },
  { id: 'sp-diplomacy', name: L('Diplomacy & policy', 'Diplomatie et politiques'), emoji: '🏛️', about: L('Briefings, protocol, development work.', 'Briefings, protocole, développement.'), group: 'goal' },
  { id: 'sp-travel', name: L('Travel & daily life', 'Voyages et quotidien'), emoji: '✈️', about: L('Markets, directions, Francophone cities.', 'Marchés, itinéraires, villes francophones.'), group: 'goal' },
  { id: 'sp-exams', name: L('DELF / DALF / TCF', 'DELF / DALF / TCF'), emoji: '📝', about: L('Exam tips, practice and nerves.', 'Conseils, entraînement et trac.'), group: 'goal' },
  { id: 'sp-grammar', name: L('Grammar help', 'Aide en grammaire'), emoji: '❓', about: L('Ask anything. Tutors verify the best answers.', 'Posez vos questions. Les tuteurs valident les meilleures réponses.'), group: 'open' },
  { id: 'sp-africa', name: L('Francophone Africa', 'Afrique francophone'), emoji: '🌍', about: L('Culture, music, news from Dakar to Kinshasa.', 'Culture, musique, actualité de Dakar à Kinshasa.'), group: 'open' },
];

/* ---------------- Records ---------------- */

export type CafePostKind = 'post' | 'question' | 'challenge';

export interface CafePost {
  id: string;
  /** A space id, or a study group id for its own feed. */
  spaceId: string;
  authorId: string;
  kind: CafePostKind;
  body: string;
  /** The author says it's written in French (counts towards the café quest when long enough). */
  french: boolean;
  createdAt: string;
  editedAt?: string;
  pinned?: boolean;
  hidden?: boolean;
  locked?: boolean;
  /** Question posts: the comment a tutor marked as the right answer. */
  acceptedCommentId?: string;
}

export interface CafeComment {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  createdAt: string;
  hidden?: boolean;
}

export interface CafeReaction {
  targetId: string; // post or comment
  userId: string;
  emoji: string;
}

export interface StudyGroup {
  id: string;
  name: string;
  level: CefrLevel;
  goal: string;
  /** e.g. "Tuesdays 19:00 GMT" */
  usualTime: string;
  ownerId: string;
  memberIds: string[];
  sessions: { id: string; start: string; topic: string; createdBy: string }[];
  createdAt: string;
}

export interface CafeState {
  posts: CafePost[];
  comments: CafeComment[];
  reactions: CafeReaction[];
  saves: { userId: string; postId: string }[];
  follows: { userId: string; spaceId: string }[];
  groups: StudyGroup[];
}

export const STUDY_GROUP_MAX = 8;
export const QUICK_REACTIONS = ['👍', '❤️', '😂', '💡', '👏', '🇫🇷'] as const;
export const MAX_POST_LENGTH = 3000;
export const MAX_EMOJI_PER_POST = 30;
/** French posts of at least this many words count towards the café quest. */
export const FRENCH_POST_MIN_WORDS = 15;

/* ---------------- Text rules ---------------- */

/** Links become clickable. Messaging and social-profile links stay blocked (they move people off La Porte). */
export const URL_RE = /\bhttps?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]]/gi;
const CONTACT_LINK = /\b(?:wa\.me|chat\.whatsapp\.com|t\.me|telegram\.me|m\.me|instagram\.com|facebook\.com|fb\.com|linkedin\.com|snapchat\.com|tiktok\.com\/@)/i;
const OFFENSIVE = /\b(?:connard|connasse|salope|enculé|encule|pute|fuck(?:ing)?|bitch|nigg\w*|fdp|ntm)\b/i;
// Pictographs, plus flags (two regional-indicator letters, e.g. 🇫🇷).
const EMOJI_RE = /\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]{2}/gu;

export const wordCount = (s: string) => s.trim().split(/\s+/).filter((w) => /\p{L}/u.test(w)).length;
export const emojiCount = (s: string) => (s.match(EMOJI_RE) ?? []).length;
export const linksIn = (s: string) => [...s.matchAll(URL_RE)].map((m) => m[0]);

/** Why a post or comment can't be published, or null when it's fine. */
export function cafeTextIssue(text: string): string | null {
  const body = text.trim();
  if (!body) return 'Write something first.';
  if (body.length > MAX_POST_LENGTH) return `Keep it under ${MAX_POST_LENGTH} characters.`;
  if (emojiCount(body) > MAX_EMOJI_PER_POST) return 'That is a lot of emoji: please keep it to 30 or fewer.';
  if (OFFENSIVE.test(body)) return 'Please keep the café friendly: that word isn’t allowed.';
  if (linksIn(body).some((u) => CONTACT_LINK.test(u))) return 'Links to messaging apps or social profiles can’t be shared. Keep contact inside La Porte.';
  // Links are fine here; check the rest for phone numbers, emails and handles.
  const withoutLinks = body.replace(URL_RE, ' ');
  if (findContactDetails(withoutLinks).some((k) => k !== 'link')) return 'Phone numbers, emails and social handles can’t be shared. Keep contact inside La Porte.';
  return null;
}

/* ---------------- Rules ---------------- */

const isStaff = (u: ContentUser) => u.role === 'instructor' || u.role === 'admin';
const cafeOf = (s: ContentState): CafeState => s.cafe ?? emptyCafe();
export const emptyCafe = (): CafeState => ({ posts: [], comments: [], reactions: [], saves: [], follows: [], groups: [] });

function canSeeSpace(state: ContentState, user: ContentUser, spaceId: string) {
  if (CAFE_SPACES.some((s) => s.id === spaceId)) return true;
  const g = cafeOf(state).groups.find((x) => x.id === spaceId);
  return !!g && (isStaff(user) || g.memberIds.includes(user.id));
}

function mutate<R>(state: ContentState, run: (cafe: CafeState) => R) {
  const next = structuredClone(state);
  next.cafe = cafeOf(next);
  const out = run(next.cafe);
  return { state: next, ...out };
}

const findPost = (cafe: CafeState, id: string) => cafe.posts.find((p) => p.id === id) ?? fail(404, 'not_found', 'Post not found');

export const cafeOps = {
  post(state: ContentState, ctx: Ctx, input: { spaceId: string; body: string; kind?: CafePostKind; french?: boolean }) {
    if (!canSeeSpace(state, ctx.user, input.spaceId)) fail(403, 'forbidden', 'Join this study group to post in it.');
    const kind: CafePostKind = input.kind === 'challenge' ? (isStaff(ctx.user) ? 'challenge' : fail(403, 'forbidden', 'Only tutors post weekly challenges.')) : input.kind === 'question' ? 'question' : 'post';
    const issue = cafeTextIssue(input.body);
    if (issue) fail(422, 'not_allowed', issue);
    return mutate(state, (cafe) => {
      const post: CafePost = { id: ctx.newId('cp'), spaceId: input.spaceId, authorId: ctx.user.id, kind, body: input.body.trim(), french: !!input.french, createdAt: ctx.now, ...(kind === 'challenge' ? { pinned: true } : {}) };
      cafe.posts.unshift(post);
      return { post };
    });
  },

  editPost(state: ContentState, ctx: Ctx, input: { postId: string; body: string }) {
    const issue = cafeTextIssue(input.body);
    if (issue) fail(422, 'not_allowed', issue);
    return mutate(state, (cafe) => {
      const p = findPost(cafe, input.postId);
      if (p.authorId !== ctx.user.id) fail(403, 'forbidden', 'You can only edit your own posts.');
      Object.assign(p, { body: input.body.trim(), editedAt: ctx.now });
      return { post: p };
    });
  },

  deletePost(state: ContentState, ctx: Ctx, input: { postId: string }) {
    return mutate(state, (cafe) => {
      const p = findPost(cafe, input.postId);
      if (p.authorId !== ctx.user.id && !isStaff(ctx.user)) fail(403, 'forbidden', 'You can only delete your own posts.');
      cafe.posts = cafe.posts.filter((x) => x.id !== p.id);
      cafe.comments = cafe.comments.filter((c) => c.postId !== p.id);
      return {};
    });
  },

  comment(state: ContentState, ctx: Ctx, input: { postId: string; body: string }) {
    const issue = cafeTextIssue(input.body);
    if (issue) fail(422, 'not_allowed', issue);
    return mutate(state, (cafe) => {
      const p = findPost(cafe, input.postId);
      if (!canSeeSpace(state, ctx.user, p.spaceId)) fail(403, 'forbidden', 'Join this study group to reply.');
      if (p.locked) fail(409, 'locked', 'Replies are closed on this post.');
      const comment: CafeComment = { id: ctx.newId('cc'), postId: p.id, authorId: ctx.user.id, body: input.body.trim(), createdAt: ctx.now };
      cafe.comments.push(comment);
      return { comment };
    });
  },

  deleteComment(state: ContentState, ctx: Ctx, input: { commentId: string }) {
    return mutate(state, (cafe) => {
      const c = cafe.comments.find((x) => x.id === input.commentId) ?? fail(404, 'not_found', 'Reply not found');
      if (c.authorId !== ctx.user.id && !isStaff(ctx.user)) fail(403, 'forbidden', 'You can only delete your own replies.');
      cafe.comments = cafe.comments.filter((x) => x.id !== c.id);
      return {};
    });
  },

  /** Adds the reaction, or removes it if this person already reacted with that emoji. */
  react(state: ContentState, ctx: Ctx, input: { targetId: string; emoji: string }) {
    const emoji = input.emoji.trim();
    if (!emoji || emoji.length > 16 || emojiCount(emoji) < 1 || /[\p{L}\p{N}]/u.test(emoji.replace(/️|‍/g, '').replace(/[\u{1F1E6}-\u{1F1FF}]/gu, ''))) fail(422, 'invalid_emoji', 'Pick an emoji.');
    return mutate(state, (cafe) => {
      if (!cafe.posts.some((p) => p.id === input.targetId) && !cafe.comments.some((c) => c.id === input.targetId)) fail(404, 'not_found', 'Post not found');
      const mine = cafe.reactions.find((r) => r.targetId === input.targetId && r.userId === ctx.user.id && r.emoji === emoji);
      cafe.reactions = mine ? cafe.reactions.filter((r) => r !== mine) : [...cafe.reactions, { targetId: input.targetId, userId: ctx.user.id, emoji }];
      return { on: !mine };
    });
  },

  save(state: ContentState, ctx: Ctx, input: { postId: string; on: boolean }) {
    return mutate(state, (cafe) => {
      findPost(cafe, input.postId);
      cafe.saves = cafe.saves.filter((s) => !(s.userId === ctx.user.id && s.postId === input.postId));
      if (input.on) cafe.saves.push({ userId: ctx.user.id, postId: input.postId });
      return {};
    });
  },

  follow(state: ContentState, ctx: Ctx, input: { spaceId: string; on: boolean }) {
    if (!CAFE_SPACES.some((s) => s.id === input.spaceId)) fail(404, 'not_found', 'Space not found');
    return mutate(state, (cafe) => {
      cafe.follows = cafe.follows.filter((f) => !(f.userId === ctx.user.id && f.spaceId === input.spaceId));
      if (input.on) cafe.follows.push({ userId: ctx.user.id, spaceId: input.spaceId });
      return {};
    });
  },

  /** Tutors and admins: pin, hide or lock a post. */
  moderate(state: ContentState, ctx: Ctx, input: { postId?: string; commentId?: string; action: 'pin' | 'unpin' | 'hide' | 'show' | 'lock' | 'unlock' }) {
    if (!isStaff(ctx.user)) fail(403, 'forbidden', 'Only tutors and the La Porte team moderate the café.');
    return mutate(state, (cafe) => {
      if (input.commentId) {
        const c = cafe.comments.find((x) => x.id === input.commentId) ?? fail(404, 'not_found', 'Reply not found');
        c.hidden = input.action === 'hide';
        return {};
      }
      const p = findPost(cafe, input.postId ?? '');
      if (input.action === 'pin' || input.action === 'unpin') p.pinned = input.action === 'pin';
      if (input.action === 'hide' || input.action === 'show') p.hidden = input.action === 'hide';
      if (input.action === 'lock' || input.action === 'unlock') p.locked = input.action === 'lock';
      return {};
    });
  },

  /** Tutors mark the right answer on a question. */
  acceptAnswer(state: ContentState, ctx: Ctx, input: { postId: string; commentId: string | null }) {
    if (!isStaff(ctx.user)) fail(403, 'forbidden', 'Only tutors verify answers.');
    return mutate(state, (cafe) => {
      const p = findPost(cafe, input.postId);
      if (p.kind !== 'question') fail(422, 'not_question', 'Only questions have verified answers.');
      if (input.commentId && !cafe.comments.some((c) => c.id === input.commentId && c.postId === p.id)) fail(404, 'not_found', 'Reply not found');
      p.acceptedCommentId = input.commentId ?? undefined;
      return {};
    });
  },

  /** Anyone can flag a post or reply; it goes to the La Porte review queue. */
  report(state: ContentState, ctx: Ctx, input: { postId?: string; commentId?: string; reason: 'contact' | 'inappropriate' | 'spam' | 'other'; note?: string }) {
    const cafe = cafeOf(state);
    const target = input.commentId ? cafe.comments.find((c) => c.id === input.commentId) : cafe.posts.find((p) => p.id === input.postId);
    if (!target) fail(404, 'not_found', 'Post not found');
    if (target!.authorId === ctx.user.id) fail(422, 'own_message', 'You cannot report your own post.');
    const next = structuredClone(state);
    const messageId = target!.id;
    if (!next.reports.some((r) => r.messageId === messageId && r.reporterId === ctx.user.id))
      next.reports.unshift({ id: ctx.newId('rep'), threadId: `cafe:${'postId' in target! ? target!.postId : target!.id}`, messageId, excerpt: target!.body.slice(0, 500), authorId: target!.authorId, reporterId: ctx.user.id, reason: input.reason, note: input.note, at: ctx.now, status: 'open' });
    return { state: next };
  },

  createGroup(state: ContentState, ctx: Ctx, input: { name: string; level: CefrLevel; goal: string; usualTime: string }) {
    if (ctx.user.role !== 'learner') fail(403, 'forbidden', 'Study groups are made by learners.');
    if (input.name.trim().length < 3) fail(422, 'invalid_name', 'Give the group a name.');
    const issue = cafeTextIssue(`${input.name} ${input.goal} ${input.usualTime}`);
    if (issue) fail(422, 'not_allowed', issue);
    if (cafeOf(state).groups.filter((g) => g.memberIds.includes(ctx.user.id)).length >= 3) fail(409, 'too_many', 'You can be in up to 3 study groups.');
    return mutate(state, (cafe) => {
      const group: StudyGroup = { id: ctx.newId('grp'), name: input.name.trim(), level: input.level, goal: input.goal.trim(), usualTime: input.usualTime.trim(), ownerId: ctx.user.id, memberIds: [ctx.user.id], sessions: [], createdAt: ctx.now };
      cafe.groups.unshift(group);
      return { group };
    });
  },

  joinGroup(state: ContentState, ctx: Ctx, input: { groupId: string; on: boolean }) {
    if (ctx.user.role !== 'learner') fail(403, 'forbidden', 'Only learners join study groups.');
    return mutate(state, (cafe) => {
      const g = cafe.groups.find((x) => x.id === input.groupId) ?? fail(404, 'not_found', 'Group not found');
      if (input.on) {
        if (g.memberIds.includes(ctx.user.id)) return { group: g };
        if (g.memberIds.length >= STUDY_GROUP_MAX) fail(409, 'full', `This group is full (${STUDY_GROUP_MAX} people).`);
        if (cafe.groups.filter((x) => x.memberIds.includes(ctx.user.id)).length >= 3) fail(409, 'too_many', 'You can be in up to 3 study groups.');
        g.memberIds.push(ctx.user.id);
      } else {
        g.memberIds = g.memberIds.filter((m) => m !== ctx.user.id);
        if (g.ownerId === ctx.user.id && g.memberIds.length) g.ownerId = g.memberIds[0];
        if (!g.memberIds.length) cafe.groups = cafe.groups.filter((x) => x.id !== g.id);
      }
      return { group: g };
    });
  },

  /** Members plan a peer practice session (Google Meet in the live portal). */
  scheduleGroupSession(state: ContentState, ctx: Ctx, input: { groupId: string; start: string; topic: string }) {
    const issue = cafeTextIssue(input.topic);
    if (issue) fail(422, 'not_allowed', issue);
    if (Number.isNaN(Date.parse(input.start)) || input.start < ctx.now) fail(422, 'invalid_time', 'Pick a time in the future.');
    return mutate(state, (cafe) => {
      const g = cafe.groups.find((x) => x.id === input.groupId) ?? fail(404, 'not_found', 'Group not found');
      if (!g.memberIds.includes(ctx.user.id)) fail(403, 'forbidden', 'Only members plan sessions.');
      g.sessions = [...g.sessions, { id: ctx.newId('gs'), start: new Date(input.start).toISOString(), topic: input.topic.trim(), createdBy: ctx.user.id }].sort((a, b) => a.start.localeCompare(b.start));
      return { group: g };
    });
  },
};
export type CafeOp = keyof typeof cafeOps;
export const CAFE_OPS = Object.keys(cafeOps) as CafeOp[];

/** What a user may see: hidden posts only for staff and their author; group feeds only for members. */
export function visibleCafe(state: ContentState, user: ContentUser): CafeState {
  const cafe = cafeOf(state);
  const staff = isStaff(user);
  const posts = cafe.posts.filter((p) => canSeeSpace(state, user, p.spaceId) && (!p.hidden || staff || p.authorId === user.id));
  const ids = new Set(posts.map((p) => p.id));
  const comments = cafe.comments.filter((c) => ids.has(c.postId) && (!c.hidden || staff || c.authorId === user.id));
  const targets = new Set([...ids, ...comments.map((c) => c.id)]);
  return {
    posts,
    comments,
    reactions: cafe.reactions.filter((r) => targets.has(r.targetId)),
    saves: cafe.saves.filter((s) => s.userId === user.id),
    follows: cafe.follows.filter((f) => f.userId === user.id),
    groups: cafe.groups,
  };
}

/** French posts long enough to count, in the last 7 days (for the weekly café quest). */
export const frenchPostsSince = (state: Pick<ContentState, 'cafe'>, userId: string, since: string) =>
  (state.cafe?.posts ?? []).filter((p) => p.authorId === userId && p.french && p.createdAt >= since && wordCount(p.body) >= FRENCH_POST_MIN_WORDS).length;

/* ---------------- Seed ---------------- */

export function seedCafe(): CafeState {
  return shiftDatesInPlace({
    posts: [
      { id: 'cp-1', spaceId: 'sp-grammar', authorId: 'tut-sophie', kind: 'challenge', body: 'Défi de la semaine 🇫🇷 : racontez votre week-end en 5 phrases, au passé composé. Je corrige les trois premières réponses !', french: true, createdAt: '2026-10-26T07:30:00Z', pinned: true },
      { id: 'cp-2', spaceId: 'sp-grammar', authorId: 'lrn-grace', kind: 'question', body: 'Quick question: when do I use « depuis » and when « pendant » ? I always mix them up 😅', french: false, createdAt: '2026-10-25T18:10:00Z', acceptedCommentId: 'cc-2' },
      { id: 'cp-3', spaceId: 'sp-africa', authorId: 'lrn-kofi', kind: 'post', body: 'Je vous recommande ce reportage sur le marché de Dantokpa à Cotonou, très bon pour l’écoute : https://www.rfi.fr/fr/afrique/ Les accents béninois sont super intéressants 🌍', french: true, createdAt: '2026-10-24T20:05:00Z' },
      { id: 'cp-4', spaceId: 'sp-business', authorId: 'lrn-adwoa', kind: 'post', body: 'Demain, j’ai ma première réunion avec un fournisseur de Lomé. Quelqu’un a des phrases utiles pour négocier poliment ? Merci d’avance 🙏', french: true, createdAt: '2026-10-25T09:40:00Z' },
    ],
    comments: [
      { id: 'cc-1', postId: 'cp-2', authorId: 'lrn-ama', body: 'Same here! I think « depuis » is for something still going on?', createdAt: '2026-10-25T18:40:00Z' },
      { id: 'cc-2', postId: 'cp-2', authorId: 'tut-sophie', body: '« Depuis » + présent = it started in the past and is still true (J’apprends le français depuis deux ans). « Pendant » = a finished length of time (J’ai habité à Dakar pendant deux ans).', createdAt: '2026-10-25T19:05:00Z' },
      { id: 'cc-3', postId: 'cp-4', authorId: 'tut-thomas', body: 'Essayez : « Nous serions prêts à… si vous pouviez… » et « Quelle marge de manœuvre avez-vous sur le prix ? » Bonne chance ! 💼', createdAt: '2026-10-25T11:00:00Z' },
    ],
    reactions: [
      { targetId: 'cc-2', userId: 'lrn-grace', emoji: '💡' },
      { targetId: 'cc-2', userId: 'lrn-ama', emoji: '👏' },
      { targetId: 'cp-3', userId: 'lrn-chinedu', emoji: '🇫🇷' },
      { targetId: 'cp-3', userId: 'lrn-ama', emoji: '❤️' },
      { targetId: 'cp-1', userId: 'lrn-efua', emoji: '👍' },
    ],
    saves: [],
    follows: [{ userId: 'lrn-ama', spaceId: 'sp-business' }, { userId: 'lrn-ama', spaceId: 'sp-grammar' }],
    groups: [
      { id: 'grp-1', name: 'Les Lève-tôt d’Accra', level: 'A2', goal: 'Conversation before work', usualTime: 'Tuesdays 07:00 GMT', ownerId: 'lrn-grace', memberIds: ['lrn-grace', 'lrn-adwoa'], sessions: [{ id: 'gs-1', start: '2026-10-27T07:00:00Z', topic: 'Présenter son métier', createdBy: 'lrn-grace' }], createdAt: '2026-10-12T08:00:00Z' },
      { id: 'grp-2', name: 'Objectif DELF B1', level: 'B1', goal: 'Exam practice', usualTime: 'Saturdays 10:00 GMT', ownerId: 'lrn-kofi', memberIds: ['lrn-kofi', 'lrn-chinedu', 'lrn-yaw'], sessions: [], createdAt: '2026-10-05T10:00:00Z' },
    ],
  });
}
