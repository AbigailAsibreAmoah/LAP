import type { Booking, Tutor } from '@laporte/shared';

export interface Slot {
  time: string;
  start: string;
  available: boolean;
  /** 'calendar' = busy on the tutor's own calendar (not a portal booking). */
  reason?: 'calendar';
}

/** Monday = 1 … Sunday = 7 for a YYYY-MM-DD date. */
export const weekdayOf = (date: string) => ((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;

/** Mirrors backend `bookingService.availability` for the offline demo adapter. */
export function computeAvailability(tutor: Tutor, bookings: Booking[], date: string, hours = tutor.availability): Slot[] {
  return (hours[weekdayOf(date)] ?? []).map((time) => {
    const start = `${date}T${time}:00Z`;
    const taken = bookings.some((b) => b.tutorId === tutor.id && b.start === start && b.status === 'confirmed');
    return { time, start, available: !taken };
  });
}
