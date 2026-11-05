import type { PaymentMethod } from '@laporte/shared';

export interface InitializePaymentInput {
  reference: string;
  amountGhs: number;
  email: string;
  method: PaymentMethod;
  metadata: Record<string, string>;
}

export interface InitializePaymentResult {
  reference: string;
  /** Hosted checkout URL in production; null for the mock adapter. */
  authorizationUrl: string | null;
  simulated: boolean;
}

export interface VerifyPaymentResult {
  reference: string;
  status: 'success' | 'failed' | 'pending';
  amountGhs: number;
  simulated: boolean;
}

/** Contract for Paystack. Verification must always happen server-side. */
export interface PaymentGateway {
  initialize(input: InitializePaymentInput): Promise<InitializePaymentResult>;
  verify(reference: string): Promise<VerifyPaymentResult>;
}
