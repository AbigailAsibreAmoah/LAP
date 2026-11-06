import { applyPresence, heartbeat, nowIso, resolvePresence, TUTORS, type PresenceChange } from '@laporte/shared';
import { bookingRepository } from '../repositories/bookingRepository';
import { store } from '../repositories/demoStore';
import { nextId } from '../utils/ids';

/**
 * Tutor presence (Online / On break / Out of office / Offline). The rules live in
 * shared/presence.ts; this service only stores the records. In-memory like the rest of the
 * demo store: swap for a database (or Redis for heartbeats) in production.
 */
export const presenceService = {
  /** What everyone sees, for every tutor. */
  all() {
    const now = nowIso();
    return TUTORS.map((tu) => resolvePresence(store.presence[tu.id], tu.id, now, bookingRepository.all()));
  },
  /** The tutor's own record (with scheduled time off) and what learners see. */
  mine(tutorId: string) {
    return { record: store.presence[tutorId] ?? { tutorId }, resolved: resolvePresence(store.presence[tutorId], tutorId, nowIso(), bookingRepository.all()) };
  },
  set(tutorId: string, change: PresenceChange) {
    store.presence[tutorId] = applyPresence(store.presence[tutorId], tutorId, change, nowIso(), nextId);
    return presenceService.mine(tutorId);
  },
  beat(tutorId: string, active: boolean) {
    store.presence[tutorId] = heartbeat(store.presence[tutorId], tutorId, nowIso(), active);
    return presenceService.mine(tutorId).resolved;
  },
  record: (tutorId: string) => store.presence[tutorId],
};
