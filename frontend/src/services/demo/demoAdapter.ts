// Offline demo adapter. Mirrors the backend's business rules against the
// in-browser demo state so the prototype runs with no server at all.
// It is deliberately separate from the HTTP path so it can be deleted later.
import { canReschedule, cancellationOutcome, nowIso, missedSessions, sessionCost, type ContentState, type SessionPurpose, MEMBERSHIP_PLANS, SPEAKING_SCENARIOS, TUTORS, type Booking, type CancellationRecord, type Learner, type Payment, type PaymentMethod, canBuyLevel, levelProduct } from '@laporte/shared';
import { computeAvailability } from '../../features/bookings/availability';
import { ApiError } from '../http';

// Time-based so ids stay unique across reloads (demo state persists in localStorage).
let seq = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(++seq).toString(36)}`;
const reference = () => `LP-DEMO-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

const pendingFailures = new Set<string>();

export const demoAdapter = {
  createBooking(learner: Learner, bookings: Booking[], input: { tutorId: string; start: string; topic: string; purpose?: SessionPurpose; missedSessionId?: string }, content?: ContentState) {
    const tutor = TUTORS.find((t) => t.id === input.tutorId);
    if (!tutor) throw new ApiError(404, 'not_found', 'Tutor not found');
    const slot = computeAvailability(tutor, bookings, input.start.slice(0, 10)).find((s) => s.start === input.start);
    if (!slot) throw new ApiError(422, 'slot_unavailable', 'The tutor does not teach at this time.');
    if (!slot.available) throw new ApiError(409, 'slot_taken', 'This time has just been booked. Please choose another.');
    const purpose: SessionPurpose = input.purpose ?? 'course-help';
    if (purpose === 'catch-up') {
      const missed = (content?.cohorts ?? []).flatMap((g) => (g.memberIds.includes(learner.id) ? missedSessions(g, learner.id, nowIso()) : []));
      if (!input.missedSessionId || !missed.some((s) => s.id === input.missedSessionId)) throw new ApiError(422, 'no_missed_session', 'Choose the group class you missed.');
    }
    const { credits: cost, freeIntro } = sessionCost(bookings, learner.id, purpose);
    if (learner.credits < cost) throw new ApiError(402, 'insufficient_credits', 'You need a session credit.');
    const booking: Booking = {
      id: nextId('bk'),
      learnerId: learner.id,
      tutorId: tutor.id,
      start: input.start,
      durationMin: 60,
      kind: 'private',
      topic: input.topic,
      status: 'confirmed',
      creditCost: cost,
      purpose,
      ...(freeIntro ? { freeIntro: true } : {}),
      ...(input.missedSessionId ? { missedSessionId: input.missedSessionId } : {}),
      meeting: { provider: 'google-meet', status: 'simulated', joinUrl: null },
    };
    return { booking, creditsRemaining: learner.credits - cost };
  },

  cancelBooking(learner: Learner, booking: Booking, input: { reason: string; emergency?: boolean }) {
    if (booking.status !== 'confirmed') throw new ApiError(409, 'not_cancellable', 'Only confirmed lessons can be cancelled.');
    if (input.reason.trim().length < 3) throw new ApiError(400, 'validation_failed', 'Please give a short reason.');
    const outcome = cancellationOutcome(booking, nowIso(), input.emergency);
    const cancellation: CancellationRecord = {
      at: new Date().toISOString(),
      reason: input.reason.trim(),
      late: outcome.kind !== 'free',
      creditRefunded: outcome.refund,
      ...(outcome.kind === 'late-emergency' ? { emergency: true, review: 'pending' as const } : {}),
    };
    return { booking: { ...booking, status: 'cancelled' as const, cancellation }, creditsRemaining: learner.credits + (outcome.refund ? booking.creditCost : 0) };
  },

  reviewCancellation(adminId: string, booking: Booking, learner: Learner, decision: 'approved' | 'declined', note: string) {
    if (booking.cancellation?.review !== 'pending') throw new ApiError(409, 'not_pending', 'This case has already been decided.');
    const approved = decision === 'approved';
    return {
      booking: { ...booking, cancellation: { ...booking.cancellation, review: decision, reviewedBy: adminId, reviewNote: note, creditRefunded: approved } },
      creditsRemaining: learner.credits + (approved ? booking.creditCost : 0),
    };
  },

  rescheduleBooking(bookings: Booking[], booking: Booking, start: string) {
    if (!canReschedule(booking, nowIso()))
      throw new ApiError(409, 'policy_window', 'Lessons can be rescheduled free of charge up to 24 hours before they start. Cancel instead, or report an emergency.');
    const tutor = TUTORS.find((t) => t.id === booking.tutorId)!;
    const slot = computeAvailability(tutor, bookings, start.slice(0, 10)).find((s) => s.start === start);
    if (!slot?.available) throw new ApiError(409, 'slot_taken', 'That time is not available.');
    return { booking: { ...booking, start, rescheduledFrom: booking.start } };
  },

  initializePayment(learner: Learner, input: { planId: string; method: PaymentMethod; provider: string; simulateFailure?: boolean; discountTokenId?: string }, content?: ContentState) {
    const level = levelProduct(input.planId);
    if (level && !canBuyLevel(learner, level.level)) throw new ApiError(409, 'level_not_next', 'Levels are unlocked one at a time: buy the next level up from yours.');
    const plan = MEMBERSHIP_PLANS.find((p) => p.id === input.planId) ?? level;
    if (!plan) throw new ApiError(404, 'not_found', 'Plan not found');
    if (plan.demoPriceGhs === null) throw new ApiError(422, 'quote_required', 'This programme is priced on request.');
    let discount: Payment['discount'];
    if (input.discountTokenId) {
      const token = content?.tokens.find((t) => t.id === input.discountTokenId);
      if (!token || token.learnerId !== learner.id || token.kind !== 'discount' || token.redeemedAt) throw new ApiError(422, 'invalid_reward', 'This reward cannot be used here.');
      discount = { tokenId: token.id, percent: token.value, originalGhs: plan.demoPriceGhs };
    }
    const payment: Payment = {
      ...(discount ? { discount } : {}),
      id: nextId('pay'),
      reference: reference(),
      learnerId: learner.id,
      planId: plan.id,
      amountGhs: discount ? Math.round(plan.demoPriceGhs * (100 - discount.percent)) / 100 : plan.demoPriceGhs,
      method: input.method,
      provider: input.provider,
      status: 'pending',
      createdAt: new Date().toISOString(),
      simulated: true,
    };
    if (input.simulateFailure) pendingFailures.add(payment.reference);
    return { payment };
  },

  verifyPayment(learner: Learner, payment: Payment) {
    if (payment.status !== 'pending') return { payment, learner };
    const failed = pendingFailures.delete(payment.reference);
    const verified: Payment = { ...payment, status: failed ? 'failed' : 'success' };
    const level = levelProduct(payment.planId);
    const plan = MEMBERSHIP_PLANS.find((p) => p.id === payment.planId);
    const updated: Learner = failed ? learner : level ? { ...learner, unlockedLevel: level.level } : { ...learner, planId: plan!.id, credits: learner.credits + plan!.credits };
    return { payment: verified, learner: updated };
  },

  speakingFeedback(scenarioId: string) {
    const scenario = SPEAKING_SCENARIOS.find((s) => s.id === scenarioId);
    if (!scenario) throw new ApiError(404, 'not_found', 'Scenario not found');
    return { transcript: scenario.sampleResponse, feedback: { ...scenario.feedback, simulated: true } };
  },
};
