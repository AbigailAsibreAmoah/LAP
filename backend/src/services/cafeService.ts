import { CAFE_OPS, cafeOps, ContentError, visibleContent, type CafeOp, type ContentState, type ContentUser } from '@laporte/shared';
import { contentStore } from '../repositories/contentStore';
import { nextId } from '../utils/ids';

/** Runs one café action with the shared rules, saves the result and returns what this user may see. */
export function runCafe(user: ContentUser, op: string, args: unknown) {
  if (!CAFE_OPS.includes(op as CafeOp)) throw new ContentError(404, 'not_found', 'Unknown café action');
  if (!args || typeof args !== 'object') throw new ContentError(422, 'invalid', 'Missing details.');
  const run = cafeOps[op as CafeOp] as (s: ContentState, ctx: { user: ContentUser; now: string; newId: (p: string) => string }, input: unknown) => { state: ContentState };
  const result = run(contentStore.get(), { user, now: new Date().toISOString(), newId: nextId }, args);
  contentStore.set(result.state);
  return { ...result, state: visibleContent(result.state, user) };
}
