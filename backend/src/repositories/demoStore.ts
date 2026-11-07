import {
  BOOKINGS,
  LEARNERS,
  MESSAGE_THREADS,
  NOTIFICATIONS,
  PAYMENTS,
  VOCABULARY,
  nowIso,
  seedPresence,
  type PresenceRecord,
} from '@laporte/shared';

/**
 * In-memory demo data layer. NOT persistent — every restart returns to the
 * deterministic seed. Replace the repositories (not the services) with
 * database-backed implementations when persistence is introduced.
 */
function seed() {
  return {
    learners: structuredClone(LEARNERS),
    bookings: structuredClone(BOOKINGS),
    payments: structuredClone(PAYMENTS),
    notifications: structuredClone(NOTIFICATIONS),
    threads: structuredClone(MESSAGE_THREADS),
    vocabulary: structuredClone(VOCABULARY),
    presence: seedPresence(nowIso()) as Record<string, PresenceRecord>,
  };
}

export let store = seed();

export function resetDemoStore() {
  store = seed();
  typingReset?.();
}

/** Set by the typing service so a demo reset also clears typing signals (avoids an import cycle). */
let typingReset: (() => void) | undefined;
export const onDemoReset = (fn: () => void) => { typingReset = fn; };
