import { rollClock, shiftDatesInPlace } from '@laporte/shared';
import type { RequestHandler } from 'express';
import { contentStore } from '../repositories/contentStore';
import { store } from '../repositories/demoStore';

/**
 * Keeps the demo story on the real calendar when the server runs past midnight: the first request
 * of a new day moves every stored date forward by the days that passed (as a restart would).
 */
export const dayRollover: RequestHandler = (_req, _res, next) => {
  const days = rollClock();
  if (days) {
    shiftDatesInPlace(store, days);
    contentStore.set(shiftDatesInPlace(structuredClone(contentStore.get()), days));
  }
  next();
};
