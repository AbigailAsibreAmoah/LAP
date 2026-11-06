import { ADMIN_METRICS, CONTACT_BLOCK_MESSAGE, DEMO_TODAY, canContact, findContactDetails, type AppNotification, ownedBy } from '@laporte/shared';
import { bookingRepository } from '../repositories/bookingRepository';
import { catalogRepository } from '../repositories/catalogRepository';
import { messageRepository, notificationRepository, vocabularyRepository } from '../repositories/engagementRepository';
import { learnerRepository } from '../repositories/learnerRepository';
import { paymentRepository } from '../repositories/paymentRepository';
import { AppError, notFound } from '../utils/errors';
import { contentStore } from '../repositories/contentStore';
import { nextId } from '../utils/ids';
import { integrations } from './integrations';

export const speakingService = {
  scenarios: () => catalogRepository.scenarios(),
  /** Returns labelled sample feedback via the speech adapter (mock by default). */
  async sampleFeedback(scenarioId: string) {
    if (!catalogRepository.scenario(scenarioId)) throw notFound('Scenario');
    return integrations.speech.analyse({ scenarioId });
  },
};

export const messagingService = {
  threadsFor: (userId: string) => messageRepository.threadsFor(userId),
  post(threadId: string, from: string, body: string) {
    const thread = messageRepository.thread(threadId);
    if (!thread || !thread.participantIds.includes(from)) throw notFound('Thread');
    // Contact details may not be exchanged through the portal (brief C1).
    const found = findContactDetails(body);
    if (found.length) throw new AppError(422, 'contact_details_blocked', CONTACT_BLOCK_MESSAGE.en, { found });
    return messageRepository.append(threadId, { id: nextId('msg'), from, body, at: new Date().toISOString() });
  },
};


export const classmateMessaging = {
  start(from: string, to: string, body: string) {
    // Classmates (same group or level) by default; anyone else after a follow.
    if (!canContact(contentStore.get(), from, to)) throw new AppError(403, 'not_connected', 'Follow this learner to message them.');
    const found = findContactDetails(body);
    if (found.length) throw new AppError(422, 'contact_details_blocked', CONTACT_BLOCK_MESSAGE.en, { found });
    const thread = messageRepository.between(from, to) ?? messageRepository.create({ id: nextId('thr'), participantIds: [from, to], subject: 'Classmate', messages: [] });
    messageRepository.append(thread.id, { id: nextId('msg'), from, body, at: new Date().toISOString() });
    return thread;
  },
};

/** The support team's shared address: every admin reads and answers from the Support inbox. */
export const SUPPORT_INBOX_ID = 'adm-support';

/** Learners and tutors writing to La Porte Support (continues their existing support conversation). */
export const supportMessaging = {
  start(from: string, body: string) {
    const found = findContactDetails(body);
    if (found.length) throw new AppError(422, 'contact_details_blocked', CONTACT_BLOCK_MESSAGE.en, { found });
    const thread = messageRepository.between(from, SUPPORT_INBOX_ID) ?? messageRepository.create({ id: nextId('thr'), participantIds: [from, SUPPORT_INBOX_ID], subject: 'Support', messages: [] });
    messageRepository.append(thread.id, { id: nextId('msg'), from, body, at: new Date().toISOString() });
    return thread;
  },
};

/** Tutors and admins writing to a learner (feedback, follow-ups). Staff may only start conversations with learners. */
export const staffMessaging = {
  start(from: string, to: string, subject: string, body: string) {
    if (!to.startsWith('lrn-')) throw new AppError(403, 'learners_only', 'Staff can start conversations with learners only.');
    const found = findContactDetails(body);
    if (found.length) throw new AppError(422, 'contact_details_blocked', CONTACT_BLOCK_MESSAGE.en, { found });
    const thread = messageRepository.between(from, to) ?? messageRepository.create({ id: nextId('thr'), participantIds: [from, to], subject, messages: [] });
    messageRepository.append(thread.id, { id: nextId('msg'), from, body, at: new Date().toISOString() });
    return thread;
  },
};

export const notificationService = {
  list: () => notificationRepository.all(),
  /** Records a portal notification. Email/WhatsApp copies go through the (mock) sender. */
  record(n: Pick<AppNotification, 'channel' | 'title' | 'body' | 'simulated' | 'learnerId'>) {
    return notificationRepository.insert({ ...n, id: nextId('ntf'), createdAt: new Date().toISOString(), read: false });
  },
  markRead(id: string) {
    const n = notificationRepository.markRead(id);
    if (!n) throw notFound('Notification');
    return n;
  },
};

export const adminService = {
  overview: () => ({
    metrics: ADMIN_METRICS,
    learners: learnerRepository.all(),
    bookings: bookingRepository.all(),
    payments: paymentRepository.all(),
    note: 'Institute figures are illustrative demo data.',
  }),
};

export const vocabularyService = {
  add(input: { fr: string; en: string; example: string; source: string }, learnerId: string) {
    const existing = vocabularyRepository.all().find((v) => ownedBy(v, learnerId) && v.fr.toLowerCase() === input.fr.toLowerCase());
    return existing ?? vocabularyRepository.insert({ ...input, learnerId, id: nextId('v'), addedOn: DEMO_TODAY, mastered: false });
  },
  toggle(id: string) {
    const v = vocabularyRepository.toggleMastered(id);
    if (!v) throw notFound('Vocabulary entry');
    return v;
  },
};
