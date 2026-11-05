import { defineConfig } from 'vitest/config';

// Tests run on a frozen clock (Monday 26 Oct 2026, 09:00 GMT) so seeded bookings and policies are repeatable.
export default defineConfig({
  test: { env: { LAPORTE_FIXED_TODAY: '2026-10-26', CONTENT_STORE: 'memory' } },
});
