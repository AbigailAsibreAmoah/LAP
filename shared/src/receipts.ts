// Payment receipts: one definition used by the in-app receipt, the PDF download and the email.
import { productName } from './access';
import type { Learner, Localized, Payment } from './types';

export interface ReceiptLine { label: Localized; amountGhs: number }
export interface Receipt {
  number: string; // the payment reference
  issuedAt: string;
  billedTo: { name: string; email?: string; city: string };
  lines: ReceiptLine[];
  subtotalGhs: number;
  discount?: { percent: number; amountGhs: number };
  totalGhs: number;
  method: Payment['method'];
  provider: string;
  status: Payment['status'];
  /** True while payments run on the simulated gateway (no money moved). */
  simulated: boolean;
}

export const ISSUER = {
  name: 'La Porte French Institute',
  address: 'Accra, Ghana',
  email: 'support@laporte.demo',
};

/** Builds the receipt for a payment. Only successful payments have one. */
export function buildReceipt(payment: Payment, learner: Pick<Learner, 'name' | 'email' | 'city'>): Receipt | null {
  if (payment.status !== 'success') return null;
  const original = payment.discount?.originalGhs ?? payment.amountGhs;
  return {
    number: payment.reference,
    issuedAt: payment.createdAt,
    billedTo: { name: learner.name, email: learner.email, city: learner.city },
    lines: [{ label: productName(payment.planId), amountGhs: original }],
    subtotalGhs: original,
    discount: payment.discount ? { percent: payment.discount.percent, amountGhs: Math.max(0, original - payment.amountGhs) } : undefined,
    totalGhs: payment.amountGhs,
    method: payment.method,
    provider: payment.provider,
    status: payment.status,
    simulated: payment.simulated === true,
  };
}

/** Plain-text version for email bodies. */
export function receiptText(r: Receipt, lang: 'en' | 'fr') {
  const fr = lang === 'fr';
  const money = (n: number) => `GH₵ ${n.toLocaleString(fr ? 'fr-FR' : 'en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return [
    `${ISSUER.name} — ${fr ? 'Reçu' : 'Receipt'} ${r.number}`,
    `${fr ? 'Date' : 'Date'}: ${r.issuedAt.slice(0, 10)}`,
    `${fr ? 'Facturé à' : 'Billed to'}: ${r.billedTo.name}${r.billedTo.email ? ` <${r.billedTo.email}>` : ''}`,
    ...r.lines.map((l) => `${l.label[lang]}: ${money(l.amountGhs)}`),
    ...(r.discount ? [`${fr ? 'Remise' : 'Discount'} (${r.discount.percent}%): −${money(r.discount.amountGhs)}`] : []),
    `${fr ? 'Total payé' : 'Total paid'}: ${money(r.totalGhs)} · ${r.provider}`,
    ...(r.simulated ? [fr ? 'Paiement simulé (démo) : aucun montant n’a été débité.' : 'Simulated payment (demo): no money was charged.'] : []),
  ].join('\n');
}
