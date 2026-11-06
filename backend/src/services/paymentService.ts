import { buildReceipt, canBuyLevel, communityOps, levelProduct, receiptText, type Payment, type PaymentMethod } from '@laporte/shared';
import { contentStore } from '../repositories/contentStore';
import { catalogRepository } from '../repositories/catalogRepository';
import { learnerRepository } from '../repositories/learnerRepository';
import { paymentRepository } from '../repositories/paymentRepository';
import { AppError, notFound } from '../utils/errors';
import { nextId, paymentReference } from '../utils/ids';
import { notificationService } from './engagementService';
import { integrations } from './integrations';

/** Emails a payment receipt to its learner. Simulated until a real email provider is configured. */
export async function emailReceipt(payment: Payment) {
  const learner = learnerRepository.byId(payment.learnerId);
  const receipt = learner && buildReceipt(payment, learner);
  if (!learner || !receipt) throw new AppError(409, 'no_receipt', 'Only successful payments have a receipt.');
  const to = learner.email ?? `${learner.id}@demo.invalid`;
  const result = await integrations.notifications.send({ channel: 'email', to, template: 'payment-receipt', variables: { reference: receipt.number, total: String(receipt.totalGhs), text: receiptText(receipt, 'en') } });
  notificationService.record({
    learnerId: learner.id,
    channel: 'email',
    title: { en: 'Payment receipt sent', fr: 'Reçu de paiement envoyé' },
    body: { en: `Receipt ${receipt.number} sent to ${to}${result.simulated ? ' (simulated)' : ''}.`, fr: `Reçu ${receipt.number} envoyé à ${to}${result.simulated ? ' (simulé)' : ''}.` },
    simulated: result.simulated,
  });
  return { sent: true, to, simulated: result.simulated };
}

export async function initializePayment(input: {
  learnerId: string;
  planId: string;
  method: PaymentMethod;
  provider: string;
  simulateFailure?: boolean;
  discountTokenId?: string;
}) {
  const learner = learnerRepository.byId(input.learnerId);
  if (!learner) throw notFound('Learner');
  // A membership plan, or the next CEFR level's courses ("level-B1").
  const level = levelProduct(input.planId);
  if (level && !canBuyLevel(learner, level.level)) throw new AppError(409, 'level_not_next', 'Levels are unlocked one at a time: your starting level, then the next level up.');
  const plan = catalogRepository.plan(input.planId) ?? level;
  if (!plan) throw notFound('Plan');
  if (plan.demoPriceGhs === null) {
    throw new AppError(422, 'quote_required', 'This programme is priced on request. Please contact the institute.');
  }

  // Reward discount (from reaching a points level): validated here, marked used only after payment succeeds.
  let discount: Payment['discount'];
  if (input.discountTokenId) {
    const token = contentStore.get().tokens.find((t) => t.id === input.discountTokenId);
    if (!token || token.learnerId !== learner.id || token.kind !== 'discount') throw new AppError(422, 'invalid_reward', 'This reward cannot be used here.');
    if (token.redeemedAt) throw new AppError(409, 'already_redeemed', 'You have already used this reward.');
    discount = { tokenId: token.id, percent: token.value, originalGhs: plan.demoPriceGhs };
  }
  const amountGhs = discount ? Math.round(plan.demoPriceGhs * (100 - discount.percent)) / 100 : plan.demoPriceGhs;

  const reference = paymentReference();
  const payment: Payment = {
    id: nextId('pay'),
    reference,
    learnerId: learner.id,
    planId: plan.id,
    amountGhs,
    method: input.method,
    provider: input.provider,
    status: 'pending',
    ...(discount ? { discount } : {}),
    createdAt: new Date().toISOString(),
    simulated: true,
  };
  paymentRepository.insert(payment);
  const init = await integrations.payments.initialize({
    reference,
    amountGhs,
    email: `${learner.id}@demo.invalid`,
    method: input.method,
    metadata: { planId: plan.id, learnerId: learner.id, simulateFailure: String(Boolean(input.simulateFailure)) },
  });
  return { payment, authorizationUrl: init.authorizationUrl, simulated: init.simulated };
}

/** Server-side verification. Credits are only granted once the gateway confirms success. */
export async function verifyPayment(reference: string) {
  const payment = paymentRepository.byReference(reference);
  if (!payment) throw notFound('Payment');
  if (payment.status !== 'pending') {
    return { payment, learner: learnerRepository.byId(payment.learnerId)! }; // idempotent
  }
  const result = await integrations.payments.verify(reference);
  payment.status = result.status;
  if (result.status === 'success') {
    const level = levelProduct(payment.planId);
    if (level) {
      const learner = learnerRepository.byId(payment.learnerId)!;
      // Paying for the starting level keeps the level as it is; a higher level unlocks it.
      if (level.level !== learner.level) learner.unlockedLevel = level.level;
      learner.paidLevels = [...new Set([...(learner.paidLevels ?? []), level.level])];
    } else {
      const plan = catalogRepository.plan(payment.planId)!;
      learnerRepository.setPlan(payment.learnerId, plan.id);
      learnerRepository.adjustCredits(payment.learnerId, plan.credits);
    }
    if (payment.discount) {
      const r = communityOps.redeemToken(contentStore.get(), { user: { id: payment.learnerId, role: 'learner' }, now: new Date().toISOString(), newId: nextId }, payment.discount.tokenId);
      contentStore.set(r.state);
    }
    // Only learners who want receipts by email get one (they can still download it in the app).
    if (learnerRepository.byId(payment.learnerId)?.receiptEmails !== false) await emailReceipt(payment);
  }
  return { payment, learner: learnerRepository.byId(payment.learnerId)! };
}
