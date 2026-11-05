// Real-time clock for the demo. The seed data is written around SEED_ANCHOR; at load it is shifted
// by whole days so "today", "tomorrow's lesson" and "last week's class" always line up with the
// real date. Set LAPORTE_FIXED_TODAY (e.g. in tests) to freeze the clock at a given day, 09:00 GMT.

/** The date the seed data was written for. */
export const SEED_ANCHOR = '2026-10-26';

const fixedToday = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.LAPORTE_FIXED_TODAY;

/** True when the clock is frozen (tests). */
export const CLOCK_FIXED = Boolean(fixedToday);

/** Today's date (YYYY-MM-DD, GMT — Ghana time). Moves forward via rollClock(). */
export let DEMO_TODAY: string = fixedToday || new Date().toISOString().slice(0, 10);

/** The current moment. Real time, unless the clock is frozen. */
export function nowIso(): string {
  return CLOCK_FIXED ? `${DEMO_TODAY}T09:00:00Z` : new Date().toISOString();
}

const DAY = 86_400_000;
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(b.slice(0, 10)) - Date.parse(a.slice(0, 10))) / DAY);

/** How far the seed data moves so its anchor lands on today. */
export let SEED_SHIFT_DAYS = daysBetween(SEED_ANCHOR, DEMO_TODAY);

/**
 * Call when the real date may have changed (e.g. a server running past midnight). Moves DEMO_TODAY
 * forward and returns how many days passed, so callers can move their data by the same amount.
 */
export function rollClock(): number {
  if (CLOCK_FIXED) return 0;
  const today = new Date().toISOString().slice(0, 10);
  const days = daysBetween(DEMO_TODAY, today);
  if (days <= 0) return 0;
  DEMO_TODAY = today;
  SEED_SHIFT_DAYS += days;
  return days;
}

const ISO = /^\d{4}-\d{2}-\d{2}(T[\d:.]+Z)?$/;

/** Moves an ISO date or date-time string by whole days (other strings are returned unchanged). */
export function shiftIso(value: string, days: number): string {
  if (!days || !ISO.test(value)) return value;
  const moved = new Date(Date.parse(value.length === 10 ? `${value}T00:00:00Z` : value) + days * DAY).toISOString();
  return value.length === 10 ? moved.slice(0, 10) : value.includes('.') ? moved : moved.replace('.000Z', 'Z');
}

/** Shifts every ISO date string inside an object or array, in place, and returns it. */
export function shiftDatesInPlace<T>(target: T, days = SEED_SHIFT_DAYS): T {
  if (!days || target === null || typeof target !== 'object') return target;
  const visit = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach((v, i) => (typeof v === 'string' ? (node[i] = shiftIso(v, days)) : visit(v)));
    } else if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        if (typeof v === 'string') (node as Record<string, unknown>)[k] = shiftIso(v, days);
        else visit(v);
      }
    }
  };
  visit(target);
  return target;
}

const WEEKDAYS_EN = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
const WEEKDAYS_FR = ['Le dimanche', 'Le lundi', 'Le mardi', 'Le mercredi', 'Le jeudi', 'Le vendredi', 'Le samedi'];

/** "Thursdays 18:00 GMT · 60 min on Google Meet", derived from a real session date. */
export function weeklySchedule(startIso: string, minutes: number) {
  const d = new Date(startIso);
  const time = startIso.slice(11, 16);
  return {
    en: `${WEEKDAYS_EN[d.getUTCDay()]} ${time} GMT · ${minutes} min on Google Meet`,
    fr: `${WEEKDAYS_FR[d.getUTCDay()]} ${time.replace(':', ' h ')} GMT · ${minutes} min sur Google Meet`,
  };
}

/** Moves a date-time off the weekend (Saturday → Friday, Sunday → Monday), keeping the time of day. */
export function weekdayIso(value: string): string {
  const day = new Date(value).getUTCDay();
  return day === 6 ? shiftIso(value, -1) : day === 0 ? shiftIso(value, 1) : value;
}

/** Days needed to move a date-time off the weekend (0 on weekdays). */
export const weekendNudge = (value: string) => {
  const day = new Date(value).getUTCDay();
  return day === 6 ? -1 : day === 0 ? 1 : 0;
};
