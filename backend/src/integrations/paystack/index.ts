import { env } from '../../config/env';
import { liveAdapterNotImplemented } from '../notConfigured';
import { createMockPaystack } from './mockPaystack';
import type { PaymentGateway } from './types';

export type { PaymentGateway } from './types';

export function createPaymentGateway(): PaymentGateway {
  return env.providers.payments === 'live' ? liveAdapterNotImplemented('Paystack') : createMockPaystack();
}
