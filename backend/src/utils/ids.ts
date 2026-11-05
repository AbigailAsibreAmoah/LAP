let counter = 0;

/** Sequential, human-readable ids for demo records. */
export function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${(2000 + counter).toString()}`;
}

/** Transaction reference in the shape we expect to send to Paystack later. */
export function paymentReference(now = new Date()): string {
  const stamp = now.toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LP-DEMO-${stamp}-${rand}`;
}
