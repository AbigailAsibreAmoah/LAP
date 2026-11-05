// Domain service interface used by the UI. Each call goes to the backend when it
// is reachable and falls back to the offline demo adapter otherwise.
import { buildPlacementResult, communityOps, ContentError, contentOps, kidOps, reviewOps, type ReviewGrade, DEMO_LEARNER_ID, nowIso, type AppNotification, type Booking, type Cohort, type ContentState, type ContentUser, type LessonInput, type LessonPatch, type Learner, type MediaAsset, type MessageThread, type PackInput, type Payment, type PaymentMethod, type PlacementInput, type PlacementResult, type QuestId, type SessionPurpose, type SpeakingFeedback, type TransitionAction, type VocabEntry, type PlacementItem, newLearner, normEmail, validEmail, type SignUpInput } from '@laporte/shared';
import { demoAdapter } from './demo/demoAdapter';
import { ApiError, detectApi, markApiUnavailable, request, upload } from './http';

export interface ServerSnapshot {
  learners: Learner[];
  bookings: Booking[];
  payments: Payment[];
  notifications: AppNotification[];
  threads: MessageThread[];
  vocabulary: VocabEntry[];
  content: ContentState;
}

let seq = 0;
const localId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(++seq).toString(36)}`;
const localCtx = (user: ContentUser, now = new Date().toISOString()) => ({ user, now, newId: localId });

/** Server when reachable, otherwise the same shared rule applied to the browser's copy. */
async function contentCall<R extends { state: ContentState }>(user: ContentUser, path: string, method: string, body: unknown, local: () => R): Promise<R> {
  if (await detectApi()) return request<R>(path, { method, body, userId: user.id });
  try {
    return local();
  } catch (e) {
    if (e instanceof ContentError) throw new ApiError(e.status, e.code, e.message);
    throw e;
  }
}

export type UploadMeta = { title: string; accent?: MediaAsset['accent']; speaker?: string; transcript?: string; durationSec: number; replaceId?: string };

type KidPatch = Parameters<typeof kidOps.updateKid>[3];
export const reviewApi = {
  review: (s: ContentState, user: ContentUser, vocabId: string, grade: ReviewGrade) => contentCall(user, `/me/vocabulary/${vocabId}/review`, 'POST', { grade }, () => reviewOps.reviewWord(s, localCtx(user), vocabId, grade)),
};

export const kidsApi = {
  create: (s: ContentState, user: ContentUser, input: Parameters<typeof kidOps.createKid>[2]) => contentCall(user, '/kids', 'POST', input, () => kidOps.createKid(s, localCtx(user), input)),
  update: (s: ContentState, user: ContentUser, id: string, patch: KidPatch) => contentCall(user, `/kids/${id}`, 'PATCH', patch, () => kidOps.updateKid(s, localCtx(user), id, patch)),
  remove: (s: ContentState, user: ContentUser, id: string) => contentCall(user, `/kids/${id}`, 'DELETE', undefined, () => kidOps.removeKid(s, localCtx(user), id)),
  record: (s: ContentState, user: ContentUser, input: Parameters<typeof kidOps.recordKidActivity>[2]) => contentCall(user, '/kids/activity', 'POST', input, () => kidOps.recordKidActivity(s, localCtx(user), input)),
  logTime: (s: ContentState, user: ContentUser, id: string, minutes: number) => contentCall(user, `/kids/${id}/time`, 'POST', { minutes }, () => kidOps.logKidTime(s, localCtx(user), id, minutes)),
  addExternal: (s: ContentState, user: ContentUser, input: Parameters<typeof kidOps.addExternalGame>[2]) => contentCall(user, '/kids/external-games', 'POST', input, () => kidOps.addExternalGame(s, localCtx(user), input)),
  removeExternal: (s: ContentState, user: ContentUser, id: string) => contentCall(user, `/kids/external-games/${id}`, 'DELETE', undefined, () => kidOps.removeExternalGame(s, localCtx(user), id)),
};

export const communityApi = {
  joinCohort: (s: ContentState, user: ContentUser, id: string) => contentCall(user, `/community/cohorts/${id}/join`, 'POST', {}, () => communityOps.joinCohort(s, localCtx(user), id)),
  leaveCohort: (s: ContentState, user: ContentUser, id: string) => contentCall(user, `/community/cohorts/${id}/leave`, 'POST', {}, () => communityOps.leaveCohort(s, localCtx(user), id)),
  createCohort: (s: ContentState, user: ContentUser, input: Pick<Cohort, 'name' | 'courseId' | 'tutorId' | 'level' | 'schedule'>) =>
    contentCall(user, '/community/cohorts', 'POST', input, () => communityOps.createCohort(s, localCtx(user), input)),
  scheduleSession: (s: ContentState, user: ContentUser, id: string, input: { start: string; durationMin: number; topic: string }) =>
    contentCall(user, `/community/cohorts/${id}/sessions`, 'POST', input, () => communityOps.scheduleSession(s, localCtx(user), id, input)),
  takeAttendance: (s: ContentState, user: ContentUser, id: string, sid: string, attended: string[]) =>
    contentCall(user, `/community/cohorts/${id}/sessions/${sid}/attendance`, 'POST', { attended }, () => communityOps.takeAttendance(s, localCtx(user, nowIso()), id, sid, attended)),
  postGroupAssignment: (s: ContentState, user: ContentUser, id: string, input: { title: string; prompt: { en: string; fr: string }; dueOn?: string }) =>
    contentCall(user, `/community/cohorts/${id}/assignments`, 'POST', input, () => communityOps.postGroupAssignment(s, localCtx(user), id, input)),
  reportMessage: (s: ContentState, user: ContentUser, input: Parameters<typeof contentOps.reportMessage>[2]) =>
    contentCall(user, '/reports', 'POST', input, () => contentOps.reportMessage(s, localCtx(user), input)),
  resolveReport: (s: ContentState, user: ContentUser, id: string, outcome: 'actioned' | 'dismissed') =>
    contentCall(user, `/admin/reports/${id}/resolve`, 'POST', { outcome }, () => contentOps.resolveReport(s, localCtx(user), id, outcome)),
  setAnswerSharing: (s: ContentState, user: ContentUser, id: string, aid: string, share: boolean) =>
    contentCall(user, `/community/cohorts/${id}/assignments/${aid}/sharing`, 'POST', { share }, () => communityOps.setAnswerSharing(s, localCtx(user), id, aid, share)),
  respondGroupAssignment: (s: ContentState, user: ContentUser, id: string, aid: string, response: string) =>
    contentCall(user, `/community/cohorts/${id}/assignments/${aid}/respond`, 'POST', { response }, () => communityOps.respondGroupAssignment(s, localCtx(user), id, aid, response)),
  follow: (s: ContentState, user: ContentUser, learnerId: string, on: boolean) => contentCall(user, '/community/follow', 'POST', { learnerId, on }, () => communityOps.follow(s, localCtx(user), learnerId, on)),
  setLeaderboardVisibility: (s: ContentState, user: ContentUser, visible: boolean) => contentCall(user, '/me/leaderboard', 'POST', { visible }, () => communityOps.setLeaderboardVisibility(s, localCtx(user), visible)),
  redeemToken: (s: ContentState, user: ContentUser, id: string) =>
    contentCall<{ state: ContentState; learner?: Learner; token: { value: number } }>(user, `/me/rewards/${id}/redeem`, 'POST', {}, () => communityOps.redeemToken(s, localCtx(user), id)),
  /** Opens (or continues) a conversation with a classmate. Returns null offline; the store creates it locally. */
  async startThread(user: ContentUser, participantId: string, body: string): Promise<MessageThread | null> {
    return (await detectApi()) ? request<MessageThread>('/threads', { method: 'POST', body: { participantId, body }, userId: user.id }) : null;
  },
};

export const contentApi = {
  fetch: async (user: ContentUser) => ((await detectApi()) ? request<ContentState>('/content', { userId: user.id }) : null),
  createLesson: (s: ContentState, user: ContentUser, input: LessonInput & { useTemplate?: boolean }) =>
    contentCall(user, '/content/lessons', 'POST', input, () => contentOps.createLesson(s, localCtx(user), input)),
  updateLesson: (s: ContentState, user: ContentUser, id: string, patch: LessonPatch, version?: number) =>
    contentCall(user, `/content/lessons/${id}`, 'PATCH', { patch, version }, () => contentOps.updateLesson(s, localCtx(user), id, patch, version)),
  transition: (s: ContentState, user: ContentUser, id: string, action: TransitionAction, note?: string) =>
    contentCall(user, `/content/lessons/${id}/${action}`, 'POST', { note }, () => contentOps.transition(s, localCtx(user), id, action, note)),
  async uploadMedia(s: ContentState, user: ContentUser, file: File, meta: UploadMeta): Promise<{ state: ContentState; asset: MediaAsset; measuredOnServer?: boolean }> {
    if (await detectApi()) {
      const form = new FormData();
      form.append('file', file);
      for (const [k, v] of Object.entries(meta)) if (v !== undefined && v !== '') form.append(k, String(v));
      return upload('/content/media', form, user.id);
    }
    // Offline: the file plays from this browser session only.
    const kind = file.type.startsWith('video/') ? 'video' : 'audio';
    const fileFields = { url: URL.createObjectURL(file), fileName: file.name, mimeType: file.type, sizeBytes: file.size, durationSec: meta.durationSec };
    try {
      return meta.replaceId
        ? contentOps.replaceMediaFile(s, localCtx(user), meta.replaceId, fileFields)
        : contentOps.addMedia(s, localCtx(user), { kind, title: meta.title, accent: meta.accent, speaker: meta.speaker, transcript: meta.transcript, ...fileFields });
    } catch (e) {
      if (e instanceof ContentError) throw new ApiError(e.status, e.code, e.message);
      throw e;
    }
  },
  deleteMedia: (s: ContentState, user: ContentUser, id: string) => contentCall(user, `/content/media/${id}`, 'DELETE', undefined, () => contentOps.deleteMedia(s, localCtx(user), id)),
  setEditors: (s: ContentState, user: ContentUser, courseId: string, tutorIds: string[]) =>
    contentCall(user, `/content/courses/${courseId}/editors`, 'PUT', { tutorIds }, () => contentOps.setEditors(s, localCtx(user), courseId, tutorIds)),
  savePack: (s: ContentState, user: ContentUser, input: PackInput, id?: string) =>
    contentCall(user, id ? `/content/packs/${id}` : '/content/packs', id ? 'PUT' : 'POST', input, () => contentOps.savePack(s, localCtx(user), input, id)),
  assignPack: (s: ContentState, user: ContentUser, input: { packId: string; learnerId: string; note: string; dueOn?: string }) =>
    contentCall(user, '/content/assignments', 'POST', input, () => contentOps.assignPack(s, localCtx(user), input)),
  submitAssignment: (s: ContentState, user: ContentUser, id: string, response: string) =>
    contentCall(user, `/content/assignments/${id}/submit`, 'POST', { response }, () => contentOps.submitAssignment(s, localCtx(user), id, response)),
  reviewAssignment: (s: ContentState, user: ContentUser, id: string, feedback: string) =>
    contentCall(user, `/content/assignments/${id}/review`, 'POST', { feedback }, () => contentOps.reviewAssignment(s, localCtx(user), id, feedback)),
  completeLesson: (s: ContentState, user: ContentUser, id: string, quizScore?: { correct: number; total: number }) =>
    contentCall(user, `/content/lessons/${id}/complete`, 'POST', { quizScore }, () => contentOps.completeLesson(s, localCtx(user), id, quizScore)),
  claimQuest: (s: ContentState, user: ContentUser, learner: { id: string; streakDays: number }, questId: QuestId) =>
    contentCall(user, '/me/quests/claim', 'POST', { questId }, () => contentOps.claimQuest(s, localCtx(user, nowIso()), learner, questId)),
  /** Starts a test attempt: questions without answers, options shuffled for this attempt (server only). */
  async placementAttempt(user: ContentUser) {
    if (!(await detectApi())) throw new ApiError(503, 'offline', 'The placement test needs a connection to La Porte. You can skip it and start at A1.');
    return request<{ attemptId: string; expiresAt: string; questions: PlacementItem[] }>('/me/placement/attempt', { method: 'POST', userId: user.id });
  },
  placement: (s: ContentState, user: ContentUser, input: PlacementInput & { attemptId?: string }) =>
    contentCall<{ state: ContentState; result: PlacementResult; learner?: Learner }>(user, '/me/placement', 'POST', input, () => {
      // Offline, only skipping is possible: the answer key never reaches the browser.
      if (Object.keys(input.answers).length) throw new ApiError(503, 'offline', 'The placement test needs a connection to La Porte.');
      const result = buildPlacementResult(input, { id: localId('pl'), learnerId: user.id, takenAt: new Date().toISOString() }, []);
      return { ...contentOps.recordPlacement(s, localCtx(user), result), result };
    }),
};

/** Context the demo adapter needs; the API path ignores it. */
export interface LocalContext {
  userId: string;
  learner?: Learner;
  bookings: Booking[];
  payments: Payment[];
  /** Content library (cohorts, reward tokens) for rules the offline adapter applies. */
  content?: ContentState;
}

export const api = {
  isConnected: detectApi,

  /**
   * Hydrates from the API's demo store. If the API is up but does not serve demo
   * state (production default), use the offline adapter for everything rather
   * than mixing server writes with local state.
   */
  async snapshot(): Promise<ServerSnapshot | null> {
    if (!(await detectApi())) return null;
    try {
      return await request<ServerSnapshot>('/demo/snapshot');
    } catch {
      markApiUnavailable();
      return null;
    }
  },

  async reset(): Promise<ServerSnapshot | null> {
    return (await detectApi()) ? request<ServerSnapshot>('/demo/reset', { method: 'POST' }) : null;
  },

  async availability(tutorId: string, date: string) {
    return request<{ time: string; start: string; available: boolean }[]>(`/tutors/${tutorId}/availability?date=${date}`);
  },

  async createBooking(ctx: LocalContext, input: { tutorId: string; start: string; topic: string; purpose?: SessionPurpose; missedSessionId?: string }) {
    if (await detectApi()) {
      return request<{ booking: Booking; creditsRemaining: number }>('/bookings', { method: 'POST', body: input, userId: ctx.userId });
    }
    return demoAdapter.createBooking(ctx.learner!, ctx.bookings, input, ctx.content);
  },

  async cancelBooking(ctx: LocalContext, id: string, input: { reason: string; emergency?: boolean }) {
    if (await detectApi()) {
      return request<{ booking: Booking; creditsRemaining: number }>(`/bookings/${id}/cancel`, { method: 'POST', body: input, userId: ctx.userId });
    }
    return demoAdapter.cancelBooking(ctx.learner!, ctx.bookings.find((b) => b.id === id)!, input);
  },

  async reviewCancellation(adminId: string, booking: Booking, learner: Learner, decision: 'approved' | 'declined', note: string) {
    if (await detectApi()) {
      return request<{ booking: Booking; creditsRemaining: number }>(`/admin/bookings/${booking.id}/exception`, { method: 'POST', body: { decision, note }, userId: adminId });
    }
    return demoAdapter.reviewCancellation(adminId, booking, learner, decision, note);
  },

  async rescheduleBooking(ctx: LocalContext, id: string, start: string) {
    if (await detectApi()) {
      return request<{ booking: Booking }>(`/bookings/${id}/reschedule`, { method: 'POST', body: { start }, userId: ctx.userId });
    }
    return demoAdapter.rescheduleBooking(ctx.bookings, ctx.bookings.find((b) => b.id === id)!, start);
  },

  async initializePayment(ctx: LocalContext, input: { planId: string; method: PaymentMethod; provider: string; simulateFailure?: boolean; discountTokenId?: string }) {
    if (await detectApi()) {
      return request<{ payment: Payment }>('/payments/initialize', { method: 'POST', body: input, userId: ctx.userId });
    }
    return demoAdapter.initializePayment(ctx.learner!, input, ctx.content);
  },

  async verifyPayment(ctx: LocalContext, reference: string) {
    if (await detectApi()) {
      return request<{ payment: Payment; learner: Learner }>(`/payments/${reference}/verify`, { method: 'POST', userId: ctx.userId });
    }
    return demoAdapter.verifyPayment(ctx.learner!, ctx.payments.find((p) => p.reference === reference)!);
  },

  async speakingFeedback(scenarioId: string): Promise<{ transcript: string; feedback: SpeakingFeedback }> {
    if (await detectApi()) {
      return request(`/speaking/scenarios/${scenarioId}/sample-feedback`, { method: 'POST' });
    }
    return demoAdapter.speakingFeedback(scenarioId);
  },

  async postMessage(userId: string, threadId: string, body: string) {
    if (await detectApi()) {
      await request(`/threads/${threadId}/messages`, { method: 'POST', body: { body }, userId });
    }
  },

  content: contentApi,
  community: communityApi,
  kids: kidsApi,
  review: reviewApi,

  /** Returns the server's entry (with its id) when connected, otherwise null. */
  async addVocabulary(entry: { fr: string; en: string; example: string; source: string }, userId: string = DEMO_LEARNER_ID): Promise<VocabEntry | null> {
    return (await detectApi()) ? request<VocabEntry>('/me/vocabulary', { method: 'POST', body: entry, userId }) : null;
  },

  async toggleVocabulary(id: string, userId: string = DEMO_LEARNER_ID) {
    if (await detectApi()) await request(`/me/vocabulary/${id}/toggle`, { method: 'POST', userId });
  },

  /** Demo accounts: the server creates the learner; offline, the browser does (same rules). */
  async register(input: SignUpInput, existing: Learner[]): Promise<Learner> {
    if (await detectApi()) return request<Learner>('/auth/register', { method: 'POST', body: input });
    if (input.name.trim().length < 2) throw new ApiError(422, 'invalid_name', 'Enter your name.');
    if (!validEmail(input.email)) throw new ApiError(422, 'invalid_email', 'Enter a valid email address.');
    if (existing.some((l) => l.email?.toLowerCase() === normEmail(input.email))) throw new ApiError(409, 'email_taken', 'An account already uses this email. Log in instead.');
    return newLearner(input, localId('lrn'), new Date().toISOString().slice(0, 10));
  },

  async login(email: string, existing: Learner[]): Promise<Learner> {
    if (await detectApi()) return request<Learner>('/auth/login', { method: 'POST', body: { email } });
    const found = existing.find((l) => l.email?.toLowerCase() === normEmail(email));
    if (!found) throw new ApiError(404, 'no_account', 'No account uses this email. Check it, or create an account.');
    return found;
  },

  async markNotificationRead(id: string) {
    if (await detectApi()) await request(`/notifications/${id}/read`, { method: 'POST' });
  },
};
