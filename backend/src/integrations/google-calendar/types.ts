/** A busy interval on a tutor's own calendar (personal events, holidays, other work). */
export interface BusyBlock {
  start: string;
  end: string;
}

/**
 * Contract for reading tutor availability from Google Calendar.
 * Live adapter: Calendar API `freebusy.query` for the tutor's calendar (service account with
 * domain-wide delegation, scope calendar.readonly or calendar.freebusy), cached a few minutes,
 * refreshed by push notifications (`events.watch`) when the tutor edits their calendar.
 */
export interface CalendarProvider {
  busy(tutorId: string, date: string): Promise<BusyBlock[]>;
}
