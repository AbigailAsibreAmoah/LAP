// Tutor presence: Online, On break, Out of office, Offline.
// Two sources, one rule (resolvePresence), used by the server and by the offline demo alike:
//  - the TUTOR sets a status: a break (15/30/60 min or "until I'm back"), out of office for some
//    dates (with a reason from a fixed list, never free text: no contact details can slip in),
//    or "appear offline";
//  - the SYSTEM works it out otherwise: active in the app → Online; app open but idle for 10 min
//    → On break; no heartbeat for 3 min → Offline; a scheduled out-of-office starts and ends by
//    itself; and during a confirmed session the tutor shows as "in a session".
import type { Booking, Localized } from './types';

export type PresenceStatus = 'online' | 'on-break' | 'out-of-office' | 'offline';

export const OOO_REASONS = {
  holiday: { en: 'On holiday', fr: 'En vacances' },
  training: { en: 'In training', fr: 'En formation' },
  sick: { en: 'Off sick', fr: 'En congé maladie' },
  personal: { en: 'Personal leave', fr: 'Congé personnel' },
  exams: { en: 'Examining (DELF / DALF)', fr: 'Jury d’examen (DELF / DALF)' },
} satisfies Record<string, Localized>;
export type OooReason = keyof typeof OOO_REASONS;

/** Break lengths a tutor can choose (minutes); null = "until I'm back". */
export const BREAK_MINUTES = [15, 30, 60] as const;

/** What a tutor set themselves. */
export type ManualPresence =
  | { status: 'on-break'; until?: string; setAt: string }
  | { status: 'offline'; setAt: string }
  | { status: 'out-of-office'; from: string; until: string; reason: OooReason; setAt: string };

export interface PresenceRecord {
  tutorId: string;
  manual?: ManualPresence;
  /** Scheduled time off (out-of-office windows), including future ones. */
  timeOff?: { id: string; from: string; until: string; reason: OooReason }[];
  /** Last heartbeat from the tutor's open app, and the last time they were actually active. */
  lastSeenAt?: string;
  lastActiveAt?: string;
  /** Demo only: shown as online (when nothing else applies) so the prototype has someone to talk to. */
  demoOnline?: boolean;
}

export interface ResolvedPresence {
  tutorId: string;
  status: PresenceStatus;
  /** 'manual' when the tutor chose it, 'auto' when the system worked it out. */
  source: 'manual' | 'auto';
  /** Break end or return date, when known. */
  until?: string;
  reason?: OooReason;
  /** Online and teaching a confirmed session right now. */
  inSession?: boolean;
}

export const SEEN_WINDOW_MS = 3 * 60_000;
export const IDLE_AFTER_MS = 10 * 60_000;
export const HEARTBEAT_MS = 60_000;

const t = (iso?: string) => (iso ? Date.parse(iso) : NaN);

/** The out-of-office window covering `at`, from the manual status or the scheduled time off. */
export function activeTimeOff(rec: PresenceRecord | undefined, at: number) {
  const windows = [...(rec?.timeOff ?? []), ...(rec?.manual?.status === 'out-of-office' ? [rec.manual] : [])];
  return windows.find((w) => t(w.from) <= at && at < t(w.until));
}

/** One rule for everyone: what learners and staff see for this tutor right now. */
export function resolvePresence(rec: PresenceRecord | undefined, tutorId: string, now: string, bookings: Booking[] = []): ResolvedPresence {
  const at = Date.parse(now);
  // 1. Out of office (chosen now, or scheduled and its dates have come) beats everything.
  const off = activeTimeOff(rec, at);
  if (off) return { tutorId, status: 'out-of-office', source: rec?.manual?.status === 'out-of-office' ? 'manual' : 'auto', until: off.until, reason: off.reason };
  const m = rec?.manual;
  // 2. A break the tutor chose, until it runs out (then the system takes over again).
  if (m?.status === 'on-break' && (!m.until || at < t(m.until))) return { tutorId, status: 'on-break', source: 'manual', ...(m.until ? { until: m.until } : {}) };
  // 3. "Appear offline".
  if (m?.status === 'offline') return { tutorId, status: 'offline', source: 'manual' };
  // 4. Worked out from activity.
  const seen = rec?.demoOnline || at - t(rec?.lastSeenAt) <= SEEN_WINDOW_MS;
  if (!seen) return { tutorId, status: 'offline', source: 'auto' };
  const inSession = bookings.some((b) => b.tutorId === tutorId && b.status === 'confirmed' && t(b.start) <= at && at < t(b.start) + b.durationMin * 60_000);
  if (inSession) return { tutorId, status: 'online', source: 'auto', inSession: true };
  const idle = !rec?.demoOnline && at - t(rec?.lastActiveAt ?? rec?.lastSeenAt) > IDLE_AFTER_MS;
  return { tutorId, status: idle ? 'on-break' : 'online', source: 'auto' };
}

/* ---------- Changes ---------- */

export type PresenceChange =
  | { kind: 'online' }
  | { kind: 'break'; minutes: number | null }
  | { kind: 'offline' }
  | { kind: 'out-of-office'; from: string; until: string; reason: OooReason }
  | { kind: 'cancel-time-off'; id: string };

export class PresenceError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

/** Applies a tutor's change. Pure: returns the new record. */
export function applyPresence(rec: PresenceRecord | undefined, tutorId: string, change: PresenceChange, now: string, newId: (p: string) => string): PresenceRecord {
  const base: PresenceRecord = { ...(rec ?? { tutorId }), tutorId, lastSeenAt: now, lastActiveAt: now };
  const at = Date.parse(now);
  switch (change.kind) {
    case 'online': {
      // Back to automatic. Ending an out-of-office early also ends today's time-off window.
      const timeOff = (base.timeOff ?? []).map((w) => (t(w.from) <= at && at < t(w.until) ? { ...w, until: now } : w)).filter((w) => t(w.until) > t(w.from));
      return { ...base, manual: undefined, timeOff };
    }
    case 'break': {
      if (change.minutes !== null && !BREAK_MINUTES.includes(change.minutes as (typeof BREAK_MINUTES)[number])) throw new PresenceError(422, 'invalid_break', 'Choose a 15, 30 or 60 minute break.');
      return { ...base, manual: { status: 'on-break', setAt: now, ...(change.minutes ? { until: new Date(at + change.minutes * 60_000).toISOString() } : {}) } };
    }
    case 'offline':
      return { ...base, manual: { status: 'offline', setAt: now } };
    case 'out-of-office': {
      const from = t(change.from), until = t(change.until);
      if (!(change.reason in OOO_REASONS)) throw new PresenceError(422, 'invalid_reason', 'Choose a reason from the list.');
      if (!Number.isFinite(from) || !Number.isFinite(until) || until <= from) throw new PresenceError(422, 'invalid_dates', 'The return date must be after the start date.');
      if (until < at) throw new PresenceError(422, 'in_the_past', 'Those dates have already passed.');
      if (until - from > 60 * 86_400_000) throw new PresenceError(422, 'too_long', 'Time off can be set for up to 60 days at a time. Contact the admin team for longer leave.');
      const w = { id: newId('ooo'), from: new Date(from).toISOString(), until: new Date(until).toISOString(), reason: change.reason };
      const timeOff = [...(base.timeOff ?? []).filter((x) => t(x.until) > at), w].sort((a, b) => t(a.from) - t(b.from));
      // Starting today clears any break / offline; a future window simply waits for its dates.
      return { ...base, timeOff, manual: from <= at ? undefined : base.manual };
    }
    case 'cancel-time-off':
      return { ...base, timeOff: (base.timeOff ?? []).filter((w) => w.id !== change.id) };
  }
}

/** Heartbeat from the tutor's open app. `active` = they used the app in the last few minutes. */
export function heartbeat(rec: PresenceRecord | undefined, tutorId: string, now: string, active: boolean): PresenceRecord {
  return { ...(rec ?? { tutorId }), tutorId, lastSeenAt: now, ...(active ? { lastActiveAt: now } : {}) };
}

/** Whether a booking starting at `start` falls in the tutor's time off. */
export function isOutOfOffice(rec: PresenceRecord | undefined, start: string) {
  return Boolean(activeTimeOff(rec, Date.parse(start)));
}

/** Demo seed, relative to now: Sophie online, Jean-Marc on a short break, Aïcha out of office
 *  (examining) for a few days, Thomas offline. Real activity and choices replace these. */
export function seedPresence(now: string): Record<string, PresenceRecord> {
  const at = Date.parse(now);
  const iso = (ms: number) => new Date(at + ms).toISOString();
  return {
    'tut-sophie': { tutorId: 'tut-sophie', demoOnline: true },
    'tut-jeanmarc': { tutorId: 'tut-jeanmarc', demoOnline: true, manual: { status: 'on-break', until: iso(25 * 60_000), setAt: iso(-5 * 60_000) } },
    'tut-aicha': { tutorId: 'tut-aicha', timeOff: [{ id: 'ooo-seed', from: iso(-86_400_000), until: iso(4 * 86_400_000), reason: 'exams' }] },
    'tut-thomas': { tutorId: 'tut-thomas', lastSeenAt: iso(-3 * 3_600_000) },
  };
}
