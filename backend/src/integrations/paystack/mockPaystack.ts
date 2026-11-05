import type { InitializePaymentInput, PaymentGateway } from './types';

/**
 * Simulates Paystack. No money moves. A reference whose metadata asks for
 * `simulateFailure` verifies as failed so the UI can demo the error path.
 */
export function createMockPaystack(): PaymentGateway {
  const pending = new Map<string, InitializePaymentInput>();
  return {
    async initialize(input) {
      pending.set(input.reference, input);
      return { reference: input.reference, authorizationUrl: null, simulated: true };
    },
    async verify(reference) {
      const tx = pending.get(reference);
      if (!tx) return { reference, status: 'failed', amountGhs: 0, simulated: true };
      const status = tx.metadata.simulateFailure === 'true' ? 'failed' : 'success';
      return { reference, status, amountGhs: tx.amountGhs, simulated: true };
    },
  };
}
