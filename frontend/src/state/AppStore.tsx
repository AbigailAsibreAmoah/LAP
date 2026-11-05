import { BOOKINGS, CLOCK_FIXED, DEMO_LEARNER_ID, DEMO_TODAY, DEMO_TUTOR_ID, LEARNERS, MESSAGE_THREADS, MILESTONES, NOTIFICATIONS, PAYMENTS, TUTORS, VOCABULARY, CONTACT_BLOCK_MESSAGE, SEED_SHIFT_DAYS, shiftIso, canContact, isClassmate, communityOps, type Cohort, type SessionPurpose, nowIso, findContactDetails, pointsFor, questProgress, seedContent, visibleContent, type AppNotification, type ContentState, type ContentUser, type LessonInput, type LessonPatch, type PackInput, type PlacementInput, type QuestId, type TransitionAction, type Booking, type Learner, type MessageThread, type Milestone, type Payment, type PaymentMethod, type Role, type VocabEntry, ownedBy, type SignUpInput } from '@laporte/shared';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { computeAvailability, type Slot } from '../features/bookings/availability';
import { api, type ServerSnapshot, type UploadMeta } from '../services/api';
import { ApiError } from '../services/http';
import { setDisplayTimeZone } from '../utils/format';
import { readLocal, removeLocal, writeLocal } from '../utils/storage';

export const DEMO_ADMIN_ID = 'adm-support';
const SERVER_KEY = `laporte-demo-server-v4-${DEMO_TODAY}`;
const LOCAL_KEY = 'laporte-demo-local-v1';

/** State the backend owns when connected (persisted locally only in offline demo mode). */
type ServerSlice = ServerSnapshot;

/** Prototype-only state that has no backend yet (always kept in this browser). */
interface LocalSlice {
  role: Role;
  /** The signed-in learner (the demo starts as Ama Owusu). */
  learnerId: string;
  milestones: Milestone[];
  availability: Record<string, Record<number, string[]>>;
  notes: Record<string, { text: string; at: string }[]>;
  submissions: Record<string, string>;
  completedScenarios: string[];
  /** IANA time zone used to display lesson times. */
  timeZone: string;
  /** Lessons whose quiz was retried (a retry means the quiz was not aced first time). */
  quizRetried: string[];
}

const seedServer = (): ServerSlice => ({
  learners: structuredClone(LEARNERS),
  bookings: structuredClone(BOOKINGS),
  payments: structuredClone(PAYMENTS),
  notifications: structuredClone(NOTIFICATIONS),
  threads: structuredClone(MESSAGE_THREADS),
  vocabulary: structuredClone(VOCABULARY),
  content: seedContent(),
});

const seedLocal = (): LocalSlice => ({
  role: 'learner',
  learnerId: DEMO_LEARNER_ID,
  milestones: structuredClone(MILESTONES),
  availability: Object.fromEntries(TUTORS.map((t) => [t.id, structuredClone(t.availability)])),
  notes: {
    'lrn-ama': [{ text: 'Confident introductions. Next: practise polite disagreement for the Lomé call.', at: shiftIso('2026-10-20T11:00:00Z', SEED_SHIFT_DAYS) }],
  },
  submissions: {},
  completedScenarios: [],
  timeZone: 'Africa/Accra',
  quizRetried: [],
});

function load<T>(key: string, fallback: () => T): T {
  const raw = readLocal(key);
  if (!raw) return fallback();
  try {
    return { ...fallback(), ...JSON.parse(raw) };
  } catch {
    return fallback();
  }
}

type Connection = 'checking' | 'api' | 'offline';

/** A new learner's passport: the same milestones, nothing completed yet. */
const freshMilestones: Milestone[] = MILESTONES.map((m, i) => ({ ...m, status: i === 0 ? 'in-progress' : 'upcoming', progress: 0, completedOn: undefined, evidence: [] }));

function useStoreValue() {
  const [server, setServer] = useState<ServerSlice>(() => {
    const s = load(SERVER_KEY, seedServer);
    // Collections added after the data was saved (e.g. reports) are filled from the seed.
    return { ...s, content: { ...seedContent(), ...s.content } };
  });
  const [local, setLocal] = useState<LocalSlice>(() => load(LOCAL_KEY, seedLocal));
  const [connection, setConnection] = useState<Connection>('checking');
  const serverRef = useRef(server);
  serverRef.current = server;

  // Hydrate from the backend when it is reachable; otherwise keep the local demo state.
  useEffect(() => {
    let cancelled = false;
    api
      .snapshot()
      .then((snap) => {
        if (cancelled) return;
        if (snap) {
          setServer(snap);
          setConnection('api');
        } else setConnection('offline');
      })
      .catch(() => !cancelled && setConnection('offline'));
    return () => {
      cancelled = true;
    };
  }, []);

  // Cache the last-known state so reloads render instantly; the API snapshot then reconciles it.
  useEffect(() => {
    writeLocal(SERVER_KEY, JSON.stringify(server));
  }, [server]);
  useEffect(() => {
    writeLocal(LOCAL_KEY, JSON.stringify(local));
  }, [local]);

  setDisplayTimeZone(local.timeZone);

  const learnerId = server.learners.some((l) => l.id === local.learnerId) ? local.learnerId : DEMO_LEARNER_ID;
  const learnerIdRef = useRef(learnerId);
  learnerIdRef.current = learnerId;
  const userId = local.role === 'learner' ? learnerId : local.role === 'instructor' ? DEMO_TUTOR_ID : DEMO_ADMIN_ID;
  const learner = server.learners.find((l) => l.id === learnerId)!;
  const user: ContentUser = { id: userId, role: local.role };
  const userRef = useRef(user);
  userRef.current = user;

  // In API mode the server returns only what this role may see, so refetch when the role changes.
  useEffect(() => {
    if (connection !== 'api') return;
    let cancelled = false;
    api.content
      .fetch(user)
      .then((c) => !cancelled && c && setServer((s) => ({ ...s, content: c })))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [connection, local.role]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Runs a content operation and stores the resulting state. */
  const contentRun = async <R extends { state: ContentState }>(fn: (s: ContentState, u: ContentUser) => Promise<R>) => {
    const result = await fn(serverRef.current.content, userRef.current);
    serverRef.current = { ...serverRef.current, content: result.state };
    setServer((s) => ({ ...s, content: result.state }));
    return result;
  };

  const ctx = useCallback(
    () => ({
      userId: learnerIdRef.current,
      learner: serverRef.current.learners.find((l) => l.id === learnerIdRef.current),
      bookings: serverRef.current.bookings,
      payments: serverRef.current.payments,
      content: serverRef.current.content,
    }),
    [],
  );

  const patchLearner = (id: string, patch: Partial<Learner>) =>
    setServer((s) => ({ ...s, learners: s.learners.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));
  const upsertBooking = (b: Booking) =>
    setServer((s) => ({ ...s, bookings: s.bookings.some((x) => x.id === b.id) ? s.bookings.map((x) => (x.id === b.id ? b : x)) : [...s.bookings, b] }));
  const upsertPayment = (p: Payment) =>
    setServer((s) => ({ ...s, payments: s.payments.some((x) => x.id === p.id) ? s.payments.map((x) => (x.id === p.id ? p : x)) : [...s.payments, p] }));
  // In API mode the backend records these notifications itself.
  const pushNotification = (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) =>
    connection !== 'api' &&
    setServer((s) => ({
      ...s,
      notifications: [{ ...n, id: `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, createdAt: new Date().toISOString(), read: false }, ...s.notifications],
    }));

  const actions = {
    setRole: (role: Role) => setLocal((l) => ({ ...l, role })),

    /** Demo accounts: create a learner and sign in as them. */
    async register(input: SignUpInput) {
      const created = await api.register(input, serverRef.current.learners);
      serverRef.current = { ...serverRef.current, learners: [...serverRef.current.learners.filter((x) => x.id !== created.id), created] };
      setServer((s) => ({ ...s, learners: [...s.learners.filter((x) => x.id !== created.id), created] }));
      setLocal((l) => ({ ...l, role: 'learner', learnerId: created.id }));
      return created;
    },
    async login(email: string) {
      const found = await api.login(email, serverRef.current.learners);
      if (!serverRef.current.learners.some((x) => x.id === found.id)) setServer((s) => ({ ...s, learners: [...s.learners, found] }));
      setLocal((l) => ({ ...l, role: 'learner', learnerId: found.id }));
      return found;
    },
    /** The ready-made demo learner, Ama Owusu. */
    useDemoLearner: () => setLocal((l) => ({ ...l, role: 'learner', learnerId: DEMO_LEARNER_ID })),

    setTimeZone: (timeZone: string) => setLocal((l) => ({ ...l, timeZone })),
    markQuizRetried: (lessonId: string) => setLocal((l) => (l.quizRetried.includes(lessonId) ? l : { ...l, quizRetried: [...l.quizRetried, lessonId] })),

    async availabilityFor(tutorId: string, date: string): Promise<Slot[]> {
      if (connection === 'api') return api.availability(tutorId, date);
      const tutor = TUTORS.find((t) => t.id === tutorId)!;
      return computeAvailability(tutor, serverRef.current.bookings, date, local.availability[tutorId]);
    },

    async bookLesson(input: { tutorId: string; start: string; topic: string; purpose?: SessionPurpose; missedSessionId?: string }) {
      const result = await api.createBooking(ctx(), input);
      upsertBooking(result.booking);
      patchLearner(learnerIdRef.current, { credits: result.creditsRemaining });
      const tutor = TUTORS.find((t) => t.id === input.tutorId)!;
      pushNotification({
        channel: 'whatsapp',
        title: { en: 'Booking confirmed', fr: 'Réservation confirmée' },
        body: { en: `Private lesson with ${tutor.name} booked.`, fr: `Séance privée avec ${tutor.name} réservée.` },
        simulated: true,
      });
      return result.booking;
    },

    async cancelLesson(id: string, input: { reason: string; emergency?: boolean }) {
      const result = await api.cancelBooking(ctx(), id, input);
      upsertBooking(result.booking);
      patchLearner(learnerIdRef.current, { credits: result.creditsRemaining });
      return result.booking;
    },

    async reviewCancellation(bookingId: string, decision: 'approved' | 'declined', note: string) {
      const booking = serverRef.current.bookings.find((b) => b.id === bookingId)!;
      const owner = serverRef.current.learners.find((l) => l.id === booking.learnerId)!;
      const result = await api.reviewCancellation(userId, booking, owner, decision, note);
      upsertBooking(result.booking);
      patchLearner(owner.id, { credits: result.creditsRemaining });
    },

    async rescheduleLesson(id: string, start: string) {
      const result = await api.rescheduleBooking(ctx(), id, start);
      upsertBooking(result.booking);
    },

    async startPayment(input: { planId: string; method: PaymentMethod; provider: string; simulateFailure?: boolean; discountTokenId?: string }) {
      const { payment } = await api.initializePayment(ctx(), input);
      upsertPayment(payment);
      serverRef.current = { ...serverRef.current, payments: [...serverRef.current.payments, payment] };
      return payment;
    },

    async verifyPayment(reference: string) {
      const result = await api.verifyPayment(ctx(), reference);
      upsertPayment(result.payment);
      patchLearner(result.learner.id, { planId: result.learner.planId, credits: result.learner.credits, unlockedLevel: result.learner.unlockedLevel });
      // A reward discount is used only once the payment succeeds.
      if (result.payment.status === 'success' && result.payment.discount) {
        if (connection === 'api') {
          const fresh = await api.content.fetch(userRef.current).catch(() => null);
          if (fresh) setServer((s) => ({ ...s, content: fresh }));
        } else {
          const r = communityOps.redeemToken(serverRef.current.content, { user: userRef.current, now: new Date().toISOString(), newId: (p) => `${p}-${Date.now().toString(36)}` }, result.payment.discount.tokenId);
          serverRef.current = { ...serverRef.current, content: r.state };
          setServer((s) => ({ ...s, content: r.state }));
        }
      }
      if (result.payment.status === 'success') {
        pushNotification({
          channel: 'email',
          title: { en: 'Payment receipt', fr: 'Reçu de paiement' },
          body: { en: `Receipt ${reference} (simulated).`, fr: `Reçu ${reference} (simulé).` },
          simulated: true,
        });
      }
      return result.payment;
    },

    async addVocab(entry: Pick<VocabEntry, 'fr' | 'en' | 'example' | 'source'>) {
      const saved = await api.addVocabulary(entry, learnerIdRef.current).catch(() => null);
      const record: VocabEntry = saved ?? { ...entry, learnerId: learnerIdRef.current, id: `v-${Date.now()}`, addedOn: DEMO_TODAY, mastered: false };
      setServer((s) => (s.vocabulary.some((v) => v.id === record.id || (ownedBy(v, learnerIdRef.current) && v.fr === record.fr)) ? s : { ...s, vocabulary: [record, ...s.vocabulary] }));
    },
    toggleMastered(id: string) {
      void api.toggleVocabulary(id, learnerIdRef.current).catch(() => undefined);
      setServer((s) => ({ ...s, vocabulary: s.vocabulary.map((v) => (v.id === id ? { ...v, mastered: !v.mastered } : v)) }));
    },

    completeMilestone(id: string) {
      setLocal((l) => {
        const idx = l.milestones.findIndex((m) => m.id === id);
        const milestones = l.milestones.map((m, i): Milestone => {
          if (i === idx)
            return {
              ...m,
              status: 'completed',
              progress: 100,
              completedOn: DEMO_TODAY,
              exercises: m.exercises.map((e) => ({ ...e, done: true })),
              evidence: [...m.evidence, { label: { en: 'Demo evidence submitted and reviewed', fr: 'Preuve de démo soumise et validée' }, date: DEMO_TODAY, by: 'Sophie Laurent (demo)' }],
            };
          if (i === idx + 1 && m.status !== 'completed') return { ...m, status: 'in-progress', progress: Math.max(m.progress, 15) };
          if (i === idx + 2 && m.status === 'locked') return { ...m, status: 'upcoming' };
          return m;
        });
        return { ...l, milestones };
      });
    },

    markNotificationRead(id: string) {
      setServer((s) => ({ ...s, notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
      void api.markNotificationRead(id).catch(() => undefined);
    },
    markAllRead() {
      serverRef.current.notifications.filter((n) => !n.read).forEach((n) => void api.markNotificationRead(n.id).catch(() => undefined));
      setServer((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
    },

    /** Throws when the message contains contact details (they may not be exchanged in the portal). */
    sendMessage(threadId: string, body: string) {
      if (findContactDetails(body).length) throw new ApiError(422, 'contact_details_blocked', CONTACT_BLOCK_MESSAGE.en);
      const message = { id: `m-${Date.now()}`, from: userId, body, at: new Date().toISOString() };
      setServer((s) => ({ ...s, threads: s.threads.map((t) => (t.id === threadId ? { ...t, messages: [...t.messages, message] } : t)) }));
      void api.postMessage(userId, threadId, body).catch(() => undefined);
    },

    addNote: (learnerId: string, text: string) =>
      setLocal((l) => ({ ...l, notes: { ...l.notes, [learnerId]: [{ text, at: new Date().toISOString() }, ...(l.notes[learnerId] ?? [])] } })),

    toggleAvailability: (tutorId: string, weekday: number, time: string) =>
      setLocal((l) => {
        const current = l.availability[tutorId]?.[weekday] ?? [];
        const next = current.includes(time) ? current.filter((t) => t !== time) : [...current, time].sort();
        return { ...l, availability: { ...l.availability, [tutorId]: { ...l.availability[tutorId], [weekday]: next } } };
      }),

    submitAssignment: (lessonId: string, text: string) => setLocal((l) => ({ ...l, submissions: { ...l.submissions, [lessonId]: text } })),
    completeScenario: (id: string) =>
      setLocal((l) => (l.completedScenarios.includes(id) ? l : { ...l, completedScenarios: [...l.completedScenarios, id] })),

    community: {
      join: (id: string) => contentRun((s, u) => api.community.joinCohort(s, u, id)),
      leave: (id: string) => contentRun((s, u) => api.community.leaveCohort(s, u, id)),
      createCohort: (input: Pick<Cohort, 'name' | 'courseId' | 'tutorId' | 'level' | 'schedule'>) => contentRun((s, u) => api.community.createCohort(s, u, input)),
      scheduleSession: (id: string, input: { start: string; durationMin: number; topic: string }) => contentRun((s, u) => api.community.scheduleSession(s, u, id, input)),
      takeAttendance: (id: string, sid: string, attended: string[]) => contentRun((s, u) => api.community.takeAttendance(s, u, id, sid, attended)),
      postAssignment: (id: string, input: { title: string; prompt: { en: string; fr: string }; dueOn?: string }) => contentRun((s, u) => api.community.postGroupAssignment(s, u, id, input)),
      report: (input: Parameters<typeof api.community.reportMessage>[2]) => contentRun((s, u) => api.community.reportMessage(s, u, input)),
      resolveReport: (id: string, outcome: 'actioned' | 'dismissed') => contentRun((s, u) => api.community.resolveReport(s, u, id, outcome)),
      shareAnswers: (id: string, aid: string, share: boolean) => contentRun((s, u) => api.community.setAnswerSharing(s, u, id, aid, share)),
      respond: (id: string, aid: string, text: string) => contentRun((s, u) => api.community.respondGroupAssignment(s, u, id, aid, text)),
      follow: (learnerId: string, on: boolean) => contentRun((s, u) => api.community.follow(s, u, learnerId, on)),
      setVisible: (visible: boolean) => contentRun((s, u) => api.community.setLeaderboardVisibility(s, u, visible)),
      async redeem(tokenId: string) {
        const out = await contentRun((s, u) => api.community.redeemToken(s, u, tokenId));
        patchLearner(learnerIdRef.current, { credits: out.learner?.credits ?? learner.credits + out.token.value });
      },
      /** Classmates (same group or level) can text and call by default; others need a follow. Contact details are never allowed. */
      canMessage: (otherId: string) => canContact(serverRef.current.content, learnerIdRef.current, otherId),
      isClassmate: (otherId: string) => isClassmate(serverRef.current.content, learnerIdRef.current, otherId),
      async message(otherId: string, body: string) {
        if (findContactDetails(body).length) throw new ApiError(422, 'contact_details_blocked', CONTACT_BLOCK_MESSAGE.en);
        if (!actions.community.canMessage(otherId)) throw new ApiError(403, 'not_connected', 'Follow this learner to message them.');
        const fromServer = await api.community.startThread(userRef.current, otherId, body);
        const existing = serverRef.current.threads.find((t) => t.participantIds.length === 2 && t.participantIds.includes(learnerIdRef.current) && t.participantIds.includes(otherId));
        const msg = { id: `m-${Date.now()}`, from: learnerIdRef.current, body, at: new Date().toISOString() };
        const thread = fromServer ?? (existing ? { ...existing, messages: [...existing.messages, msg] } : { id: `thr-${Date.now().toString(36)}`, participantIds: [learnerIdRef.current, otherId], subject: 'Classmate', messages: [msg] });
        setServer((s) => ({ ...s, threads: s.threads.some((t) => t.id === thread.id) ? s.threads.map((t) => (t.id === thread.id ? thread : t)) : [thread, ...s.threads] }));
        return thread.id;
      },
    },

    /** Spaced-repetition review of the learner's vocabulary. */
    reviewWord: (vocabId: string, grade: Parameters<typeof api.review.review>[3]) => contentRun((s, u) => api.review.review(s, u, vocabId, grade)),

    /** La Porte Kids (profiles belong to the parent's learner account). */
    kids: {
      create: (input: Parameters<typeof api.kids.create>[2]) => contentRun((s, u) => api.kids.create(s, u, input)),
      update: (id: string, patch: Parameters<typeof api.kids.update>[3]) => contentRun((s, u) => api.kids.update(s, u, id, patch)),
      remove: (id: string) => contentRun((s, u) => api.kids.remove(s, u, id)),
      record: (input: Parameters<typeof api.kids.record>[2]) => contentRun((s, u) => api.kids.record(s, u, input)),
      logTime: (id: string, minutes: number) => contentRun((s, u) => api.kids.logTime(s, u, id, minutes)),
      addExternal: (input: Parameters<typeof api.kids.addExternal>[2]) => contentRun((s, u) => api.kids.addExternal(s, u, input)),
      removeExternal: (id: string) => contentRun((s, u) => api.kids.removeExternal(s, u, id)),
    },

    content: {
      createLesson: (input: LessonInput & { useTemplate?: boolean }) => contentRun((s, u) => api.content.createLesson(s, u, input)),
      updateLesson: (id: string, patch: LessonPatch, version?: number) => contentRun((s, u) => api.content.updateLesson(s, u, id, patch, version)),
      transition: (id: string, action: TransitionAction, note?: string) => contentRun((s, u) => api.content.transition(s, u, id, action, note)),
      uploadMedia: (file: File, meta: UploadMeta) => contentRun((s, u) => api.content.uploadMedia(s, u, file, meta)),
      deleteMedia: (id: string) => contentRun((s, u) => api.content.deleteMedia(s, u, id)),
      setEditors: (courseId: string, tutorIds: string[]) => contentRun((s, u) => api.content.setEditors(s, u, courseId, tutorIds)),
      savePack: (input: PackInput, id?: string) => contentRun((s, u) => api.content.savePack(s, u, input, id)),
      assignPack: (input: { packId: string; learnerId: string; note: string; dueOn?: string }) => contentRun((s, u) => api.content.assignPack(s, u, input)),
      submitAssignment: (id: string, response: string) => contentRun((s, u) => api.content.submitAssignment(s, u, id, response)),
      reviewAssignment: (id: string, feedback: string) => contentRun((s, u) => api.content.reviewAssignment(s, u, id, feedback)),
      completeLesson: (id: string, quizScore?: { correct: number; total: number }) => contentRun((s, u) => api.content.completeLesson(s, u, id, quizScore)),
      claimQuest: (questId: QuestId) => contentRun((s, u) => api.content.claimQuest(s, u, { id: learner.id, streakDays: learner.streakDays }, questId)),
      placementAttempt: () => api.content.placementAttempt(userRef.current),
      async takePlacement(input: PlacementInput & { attemptId?: string }) {
        const out = await contentRun((s, u) => api.content.placement(s, u, input));
        patchLearner(learnerIdRef.current, { level: out.result.level });
        return out.result;
      },
    },

    async resetDemo() {
      removeLocal(SERVER_KEY);
      removeLocal(LOCAL_KEY);
      const snap = await api.reset().catch(() => null);
      setServer(snap ?? seedServer());
      setLocal((l) => ({ ...seedLocal(), role: l.role }));
    },
  };

  const isLearner = local.role === 'learner';
  const mine = {
    bookings: isLearner ? server.bookings.filter((b) => b.learnerId === learnerId) : server.bookings,
    payments: isLearner ? server.payments.filter((p) => p.learnerId === learnerId) : server.payments,
    threads: isLearner ? server.threads.filter((t) => t.participantIds.includes(learnerId)) : server.threads,
    vocabulary: server.vocabulary.filter((v) => ownedBy(v, learnerId)),
    notifications: isLearner ? server.notifications.filter((n) => ownedBy(n, learnerId)) : server.notifications,
    // The seeded passport history is Ama's; other learners start their own.
    milestones: learnerId === DEMO_LEARNER_ID ? local.milestones : freshMilestones,
  };

  return {
    ...server,
    ...local,
    ...mine,
    connection,
    userId,
    user,
    learner,
    /** Content as this role may see it (learners: published lessons and their own work only). */
    content: visibleContent(server.content, user),
    quests: questProgress(server.content, learner, nowIso()),
    points: pointsFor(server.content, learner.id),
    plan: learner.planId,
    actions,
  };
}

export type AppStore = ReturnType<typeof useStoreValue>;
// Kept on globalThis so a hot reload of this module during development reuses the same context
// (otherwise the page briefly has two contexts and shows "useStore must be used inside AppStoreProvider").
const ctxHolder = globalThis as { __laporteStoreContext?: React.Context<AppStore | null> };
const StoreContext = (ctxHolder.__laporteStoreContext ??= createContext<AppStore | null>(null));

/**
 * When the real date changes (a tab left open overnight), reload so every screen and the demo data
 * move to the new day. Waits until the tab is in the background so nothing being typed is lost.
 */
function useDayRollover() {
  useEffect(() => {
    if (CLOCK_FIXED) return;
    const changed = () => new Date().toISOString().slice(0, 10) !== DEMO_TODAY;
    const onHide = () => { if (document.visibilityState === 'hidden' && changed()) window.location.reload(); };
    const timer = window.setInterval(() => { if (changed() && document.visibilityState === 'hidden') window.location.reload(); }, 60_000);
    document.addEventListener('visibilitychange', onHide);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', onHide); };
  }, []);
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const value = useStoreValue();
  useDayRollover();
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside AppStoreProvider');
  return ctx;
}

export type { MessageThread };
