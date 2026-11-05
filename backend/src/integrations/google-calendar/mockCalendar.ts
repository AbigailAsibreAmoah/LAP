import { SEED_SHIFT_DAYS, shiftIso, weekdayIso } from '@laporte/shared';
import type { CalendarProvider } from './types';

/** Demo: one simulated personal event so the UI can show a slot blocked by the tutor's calendar. */
// Worked out on each call so it follows the live clock (see shared/clock.ts).
const simulated = (): Record<string, { start: string; end: string }[]> => ({
  'tut-sophie': [{ start: weekdayIso(shiftIso('2026-10-28T12:00:00Z', SEED_SHIFT_DAYS)), end: weekdayIso(shiftIso('2026-10-28T13:00:00Z', SEED_SHIFT_DAYS)) }],
});

export function createMockCalendar(): CalendarProvider {
  return {
    async busy(tutorId, date) {
      return (simulated()[tutorId] ?? []).filter((b) => b.start.startsWith(date));
    },
  };
}
