import { buildPlacementResult, canStudy, ownedBy, communityOps, reviewOps, type ReviewGrade, ContentError, contentOps, nowIso, LEARNERS, visibleContent, type ContentState, type ContentUser, type LessonInput, type LessonPatch, type PackInput, type PlacementInput, type QuestId, type TransitionAction } from '@laporte/shared';
import { contentStore } from '../repositories/contentStore';
import { messageRepository, vocabularyRepository } from '../repositories/engagementRepository';
import { learnerRepository } from '../repositories/learnerRepository';
import { nextId } from '../utils/ids';
import { notificationService } from './engagementService';
import { placementService } from './placementService';

const ctx = (user: ContentUser) => ({ user, now: new Date().toISOString(), newId: nextId });

/** Applies a pure content operation, persists the result and returns what this user may see. */
function apply<R extends { state: ContentState }>(user: ContentUser, run: (state: ContentState) => R) {
  const result = run(contentStore.get());
  contentStore.set(result.state);
  return { ...result, state: visibleContent(result.state, user) };
}

/** Community features (groups, follows, leaderboard, rewards) share the same persisted store. */
export const communityService = {
  joinCohort: (user: ContentUser, id: string) => apply(user, (s) => communityOps.joinCohort(s, ctx(user), id)),
  leaveCohort: (user: ContentUser, id: string) => apply(user, (s) => communityOps.leaveCohort(s, ctx(user), id)),
  createCohort: (user: ContentUser, input: Parameters<typeof communityOps.createCohort>[2]) => apply(user, (s) => communityOps.createCohort(s, ctx(user), input)),
  scheduleSession: (user: ContentUser, id: string, input: Parameters<typeof communityOps.scheduleSession>[3]) => apply(user, (s) => communityOps.scheduleSession(s, ctx(user), id, input)),
  /** Attendance is checked against the demo clock so seeded past sessions can be marked. */
  takeAttendance: (user: ContentUser, id: string, sessionId: string, attended: string[]) => apply(user, (s) => communityOps.takeAttendance(s, { ...ctx(user), now: nowIso() }, id, sessionId, attended)),
  postGroupAssignment: (user: ContentUser, id: string, input: Parameters<typeof communityOps.postGroupAssignment>[3]) => apply(user, (s) => communityOps.postGroupAssignment(s, ctx(user), id, input)),
  setAnswerSharing: (user: ContentUser, id: string, aid: string, share: boolean) => apply(user, (s) => communityOps.setAnswerSharing(s, ctx(user), id, aid, share)),
  respondGroupAssignment: (user: ContentUser, id: string, aid: string, text: string) => apply(user, (s) => communityOps.respondGroupAssignment(s, ctx(user), id, aid, text)),
  follow: (user: ContentUser, learnerId: string, on: boolean) => apply(user, (s) => communityOps.follow(s, ctx(user), learnerId, on)),
  setLeaderboardVisibility: (user: ContentUser, visible: boolean) => apply(user, (s) => communityOps.setLeaderboardVisibility(s, ctx(user), visible)),
  /** Session-credit rewards add a credit now; discount rewards are applied at checkout. */
  redeemToken(user: ContentUser, tokenId: string) {
    const token = contentStore.get().tokens.find((t) => t.id === tokenId);
    if (token?.kind === 'discount') throw new ContentError(409, 'use_at_checkout', 'Apply this discount when you renew your membership.');
    const out = apply(user, (s) => communityOps.redeemToken(s, ctx(user), tokenId));
    const learner = learnerRepository.adjustCredits(user.id, out.token.value);
    return { ...out, learner };
  },
};

export const contentService = {
  view: (user: ContentUser) => visibleContent(contentStore.get(), user),

  createLesson: (user: ContentUser, input: LessonInput & { useTemplate?: boolean }) => apply(user, (s) => contentOps.createLesson(s, ctx(user), input)),
  updateLesson: (user: ContentUser, id: string, patch: LessonPatch, version?: number) => apply(user, (s) => contentOps.updateLesson(s, ctx(user), id, patch, version)),
  transition(user: ContentUser, id: string, action: TransitionAction, note?: string) {
    const out = apply(user, (s) => contentOps.transition(s, ctx(user), id, action, note));
    if (action === 'publish')
      notificationService.record({ channel: 'in-app', title: { en: 'New lesson available', fr: 'Nouvelle leçon disponible' }, body: { en: `“${out.lesson.title}” is now available.`, fr: `« ${out.lesson.title} » est disponible.` }, simulated: false });
    return out;
  },

  addMedia: (user: ContentUser, input: Parameters<typeof contentOps.addMedia>[2]) => apply(user, (s) => contentOps.addMedia(s, ctx(user), input)),
  /** Records an uploaded file and points the asset at the streaming route in one save. */
  addUploadedMedia: (user: ContentUser, input: Parameters<typeof contentOps.addMedia>[2]) =>
    apply(user, (s) => {
      const r = contentOps.addMedia(s, ctx(user), input);
      const asset = r.state.media.find((m) => m.id === r.asset.id)!;
      asset.url = `/api/content/media/${asset.id}/file`;
      return { state: r.state, asset };
    }),
  replaceMediaFile: (user: ContentUser, id: string, file: Parameters<typeof contentOps.replaceMediaFile>[3]) => apply(user, (s) => contentOps.replaceMediaFile(s, ctx(user), id, file)),
  deleteMedia: (user: ContentUser, id: string) => apply(user, (s) => contentOps.deleteMedia(s, ctx(user), id)),
  media: (id: string) => contentStore.get().media.find((m) => m.id === id),

  setEditors: (user: ContentUser, courseId: string, tutorIds: string[]) => apply(user, (s) => contentOps.setEditors(s, ctx(user), courseId, tutorIds)),
  savePack: (user: ContentUser, input: PackInput, id?: string) => apply(user, (s) => contentOps.savePack(s, ctx(user), input, id)),

  assignPack(user: ContentUser, input: { packId: string; learnerId: string; note: string; dueOn?: string }) {
    const out = apply(user, (s) => contentOps.assignPack(s, ctx(user), input));
    notificationService.record({ channel: 'in-app', title: { en: 'New practice from your tutor', fr: 'Nouvel exercice de votre tuteur' }, body: { en: 'Open “My practice” to start.', fr: 'Ouvrez « Ma pratique » pour commencer.' }, simulated: false });
    return out;
  },
  submitAssignment: (user: ContentUser, id: string, response: string) => apply(user, (s) => contentOps.submitAssignment(s, ctx(user), id, response)),
  reviewAssignment(user: ContentUser, id: string, feedback: string) {
    const out = apply(user, (s) => contentOps.reviewAssignment(s, ctx(user), id, feedback));
    notificationService.record({ channel: 'in-app', title: { en: 'Feedback from your tutor', fr: 'Retour de votre tuteur' }, body: { en: 'Your tutor reviewed your practice.', fr: 'Votre tuteur a corrigé votre exercice.' }, simulated: false });
    return out;
  },

  /** Spaced repetition: the word must be in the learner's phrasebook. */
  reviewWord(user: ContentUser, vocabId: string, grade: ReviewGrade) {
    if (!vocabularyRepository.all().some((v) => v.id === vocabId && ownedBy(v, user.id))) throw new ContentError(404, 'not_found', 'Word not found');
    return apply(user, (s) => reviewOps.reviewWord(s, ctx(user), vocabId, grade));
  },

  /** Reports are checked against the real thread so nobody can report a message they cannot see. */
  reportMessage(user: ContentUser, input: Parameters<typeof contentOps.reportMessage>[2]) {
    const thread = messageRepository.thread(input.threadId);
    const message = thread?.messages.find((m) => m.id === input.messageId);
    if (!thread || !message || !thread.participantIds.includes(user.id)) throw new ContentError(404, 'not_found', 'Message not found');
    return apply(user, (s) => contentOps.reportMessage(s, ctx(user), { ...input, excerpt: message.body, authorId: message.from }));
  },
  resolveReport: (user: ContentUser, id: string, outcome: 'actioned' | 'dismissed') => apply(user, (s) => contentOps.resolveReport(s, ctx(user), id, outcome)),

  completeLesson(user: ContentUser, lessonId: string, quizScore?: { correct: number; total: number }) {
    const lesson = contentStore.get().lessons.find((l) => l.id === lessonId);
    const learner = learnerRepository.byId(user.id);
    if (lesson && learner && !canStudy(learner, lesson.level)) throw new ContentError(403, 'level_locked', `This lesson is at ${lesson.level}. Unlock ${lesson.level} to study it.`);
    return apply(user, (s) => contentOps.completeLesson(s, ctx(user), lessonId, quizScore));
  },

  /** Quest progress is measured against the demo clock so seeded activity counts. */
  claimQuest(user: ContentUser, questId: QuestId) {
    const learner = learnerRepository.byId(user.id) ?? { id: user.id, streakDays: 0 };
    return apply(user, (s) => contentOps.claimQuest(s, { ...ctx(user), now: nowIso() }, learner, questId));
  },

  /** Scores the placement on the server, stores it and sets the learner's provisional level. */
  recordPlacement(user: ContentUser, input: PlacementInput & { attemptId?: string }) {
    // Answers arrive by shown position; the server maps them to the real options and scores them.
    const { attemptId, ...rest } = input;
    const answers = placementService.resolve(user, attemptId, rest.answers);
    const result = buildPlacementResult({ ...rest, answers }, { id: nextId('pl'), learnerId: user.id, takenAt: new Date().toISOString() }, placementService.bank);
    const out = apply(user, (s) => contentOps.recordPlacement(s, ctx(user), result));
    placementService.complete(attemptId);
    const learner = learnerRepository.byId(user.id);
    if (learner) learner.level = result.level;
    return { ...out, result, learner };
  },
};

