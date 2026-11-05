import { canReschedule, cancellationOutcome, nowIso, missedSessions, sessionCost, type Booking, type SessionPurpose } from '@laporte/shared';
import { contentStore } from '../repositories/contentStore';
import { bookingRepository } from '../repositories/bookingRepository';
import { catalogRepository } from '../repositories/catalogRepository';
import { learnerRepository } from '../repositories/learnerRepository';
import { AppError, notFound } from '../utils/errors';
import { nextId } from '../utils/ids';
import { notificationService } from './engagementService';
import { integrations } from './integrations';

const PRIVATE_LESSON_MINUTES = 60;

/**
 * Available start times for a tutor on a date (YYYY-MM-DD):
 * teaching hours set in the portal, minus portal bookings, minus busy time on the tutor's
 * own calendar (Google Calendar free/busy; simulated in demo mode).
 */
export async function availability(tutorId: string, date: string) {
  const tutor = catalogRepository.tutor(tutorId);
  if (!tutor) throw notFound('Tutor');
  const weekday = ((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7) + 1; // Monday = 1
  const times = tutor.availability[weekday] ?? [];
  const busy = await integrations.calendar.busy(tutorId, date);
  return times.map((time) => {
    const start = `${date}T${time}:00Z`;
    const end = new Date(new Date(start).getTime() + PRIVATE_LESSON_MINUTES * 60_000).toISOString();
    const booked = Boolean(bookingRepository.activeForTutorAt(tutorId, start));
    const onCalendar = busy.some((b) => b.start < end && b.end > start);
    return { time, start, available: !booked && !onCalendar, ...(onCalendar && !booked ? { reason: 'calendar' as const } : {}) };
  });
}

export async function createBooking(input: { learnerId: string; tutorId: string; start: string; topic: string; purpose?: SessionPurpose; missedSessionId?: string }) {
  const learner = learnerRepository.byId(input.learnerId);
  if (!learner) throw notFound('Learner');
  const tutor = catalogRepository.tutor(input.tutorId);
  if (!tutor) throw notFound('Tutor');

  const slot = (await availability(tutor.id, input.start.slice(0, 10))).find((s) => s.start === input.start);
  if (!slot) throw new AppError(422, 'slot_unavailable', 'The tutor does not teach at this time.');
  if (!slot.available) throw new AppError(409, 'slot_taken', 'This time has just been booked. Please choose another.');

  // Catch-ups replace recordings: only for a group session the learner actually missed.
  const purpose: SessionPurpose = input.purpose ?? 'course-help';
  if (purpose === 'catch-up') {
    const missed = contentStore.get().cohorts.flatMap((c) => (c.memberIds.includes(learner.id) ? missedSessions(c, learner.id, nowIso()) : []));
    if (!input.missedSessionId || !missed.some((s) => s.id === input.missedSessionId))
      throw new AppError(422, 'no_missed_session', 'Choose the group class you missed.');
  }

  // Payment precedes paid bookings: the first one-on-one conversation is free, others use a credit.
  const { credits: creditCost, freeIntro } = sessionCost(bookingRepository.forLearner(learner.id), learner.id, purpose);
  if (learner.credits < creditCost) {
    throw new AppError(402, 'insufficient_credits', 'You need a session credit. Choose a membership to continue.');
  }

  const id = nextId('bk');
  const meeting = await integrations.meetings.createMeeting({
    bookingId: id,
    subject: input.topic,
    start: input.start,
    durationMin: PRIVATE_LESSON_MINUTES,
  });
  const booking: Booking = {
    id,
    learnerId: learner.id,
    tutorId: tutor.id,
    start: input.start,
    durationMin: PRIVATE_LESSON_MINUTES,
    kind: 'private',
    topic: input.topic,
    status: 'confirmed',
    creditCost,
    meeting,
    purpose,
    ...(freeIntro ? { freeIntro: true } : {}),
    ...(input.missedSessionId ? { missedSessionId: input.missedSessionId } : {}),
  };
  bookingRepository.insert(booking);
  learnerRepository.adjustCredits(learner.id, -creditCost);

  const deliveries = await Promise.all(
    (['email', 'whatsapp'] as const).map((channel) =>
      integrations.notifications.send({
        channel,
        to: learner.id,
        template: 'booking-confirmed',
        variables: { tutor: tutor.name, start: input.start },
      }),
    ),
  );

  notificationService.record({
    channel: 'whatsapp',
    title: { en: 'Booking confirmed', fr: 'Réservation confirmée' },
    body: { en: `Private lesson with ${tutor.name} booked.`, fr: `Séance privée avec ${tutor.name} réservée.` },
    simulated: true,
  });

  return { booking, creditsRemaining: learnerRepository.byId(learner.id)!.credits, deliveries };
}

/**
 * Cancellation policy (brief E6): free, with the credit refunded, at least 24 hours before the start.
 * Inside 24 hours the credit is used, unless the learner reports an emergency: an administrator then
 * reviews the case and may restore the credit. Every decision is recorded on the booking.
 * Times are measured against the demo clock (nowIso()).
 */
export async function cancelBooking(id: string, learnerId: string, input: { reason: string; emergency?: boolean }) {
  const booking = bookingRepository.byId(id);
  if (!booking || booking.learnerId !== learnerId) throw notFound('Booking');
  if (booking.status !== 'confirmed') throw new AppError(409, 'not_cancellable', 'Only confirmed lessons can be cancelled.');
  const outcome = cancellationOutcome(booking, nowIso(), input.emergency);
  booking.status = 'cancelled';
  booking.cancellation = {
    at: new Date().toISOString(),
    reason: input.reason,
    late: outcome.kind !== 'free',
    creditRefunded: outcome.refund,
    ...(outcome.kind === 'late-emergency' ? { emergency: true, review: 'pending' as const } : {}),
  };
  await integrations.meetings.cancelMeeting(id);
  if (outcome.refund) learnerRepository.adjustCredits(learnerId, booking.creditCost);
  return { booking, creditsRemaining: learnerRepository.byId(learnerId)!.credits, outcome: outcome.kind };
}

/** Admin decision on a late-cancellation emergency. Approving restores the credit. */
export function reviewCancellation(id: string, adminId: string, decision: 'approved' | 'declined', note: string) {
  const booking = bookingRepository.byId(id);
  if (!booking?.cancellation) throw notFound('Cancellation');
  if (booking.cancellation.review !== 'pending') throw new AppError(409, 'not_pending', 'This case has already been decided.');
  booking.cancellation = { ...booking.cancellation, review: decision, reviewedBy: adminId, reviewNote: note };
  if (decision === 'approved') {
    booking.cancellation.creditRefunded = true;
    learnerRepository.adjustCredits(booking.learnerId, booking.creditCost);
  }
  return { booking, creditsRemaining: learnerRepository.byId(booking.learnerId)!.credits };
}

export async function rescheduleBooking(id: string, learnerId: string, newStart: string) {
  const booking = bookingRepository.byId(id);
  if (!booking || booking.learnerId !== learnerId) throw notFound('Booking');
  if (booking.status !== 'confirmed') throw new AppError(409, 'not_reschedulable', 'Only confirmed lessons can be rescheduled.');
  if (!canReschedule(booking, nowIso()))
    throw new AppError(409, 'policy_window', 'Lessons can be rescheduled free of charge up to 24 hours before they start. Cancel instead, or report an emergency.');
  const slot = (await availability(booking.tutorId, newStart.slice(0, 10))).find((s) => s.start === newStart);
  if (!slot?.available) throw new AppError(409, 'slot_taken', 'That time is not available.');
  booking.rescheduledFrom = booking.start;
  booking.start = newStart;
  return { booking };
}
