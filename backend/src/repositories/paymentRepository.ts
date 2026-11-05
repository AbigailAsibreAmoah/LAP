import type { Payment } from '@laporte/shared';
import { store } from './demoStore';

export const paymentRepository = {
  all: () => store.payments,
  forLearner: (learnerId: string) => store.payments.filter((p) => p.learnerId === learnerId),
  byReference: (reference: string) => store.payments.find((p) => p.reference === reference),
  insert(payment: Payment) {
    store.payments.push(payment);
    return payment;
  },
};
