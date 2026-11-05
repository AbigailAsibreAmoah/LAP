import { ContentError, type ContentUser, type PlacementItem } from '@laporte/shared';
import { randomInt } from 'node:crypto';
import { PLACEMENT_BANK } from '../data/placementBank';
import { nextId } from '../utils/ids';

/*
 * Placement attempts. The answer key never leaves the server: a learner gets the questions with
 * their options shuffled for that attempt, answers by position, and the server maps those positions
 * back to the original options before scoring. A shared "the answer is B" is useless to anyone else.
 */
const ATTEMPT_MINUTES = 45;

interface Attempt {
  id: string;
  learnerId: string;
  /** For each question: shown position → original option index. */
  order: Record<string, number[]>;
  startedAt: number;
  used: boolean;
}

const attempts = new Map<string, Attempt>();

function shuffle(n: number) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const placementService = {
  /** Starts an attempt: questions without answers, options in a per-attempt order. */
  start(user: ContentUser) {
    if (user.role !== 'learner') throw new ContentError(403, 'forbidden', 'Only learners take the placement test.');
    const now = Date.now();
    for (const [id, a] of attempts) if (now - a.startedAt > ATTEMPT_MINUTES * 60_000 * 2) attempts.delete(id);
    const attempt: Attempt = { id: nextId('pa'), learnerId: user.id, order: {}, startedAt: now, used: false };
    const questions: PlacementItem[] = PLACEMENT_BANK.map((q) => {
      const order = shuffle(q.options.length);
      attempt.order[q.id] = order;
      return { id: q.id, level: q.level, skill: q.skill, prompt: q.prompt, ...(q.context ? { context: q.context } : {}), options: order.map((i) => q.options[i]) };
    });
    attempts.set(attempt.id, attempt);
    return { attemptId: attempt.id, expiresAt: new Date(now + ATTEMPT_MINUTES * 60_000).toISOString(), questions };
  },

  /** Turns answers given by position into original option indexes. Each attempt is used once. */
  resolve(user: ContentUser, attemptId: string | undefined, answers: Record<string, number>) {
    if (!Object.keys(answers).length) return answers; // skipped: nothing to score
    const attempt = attemptId ? attempts.get(attemptId) : undefined;
    if (!attempt || attempt.learnerId !== user.id) throw new ContentError(422, 'attempt_required', 'Start the test again to get your questions.');
    if (attempt.used) throw new ContentError(409, 'attempt_used', 'This test attempt has already been submitted.');
    if (Date.now() - attempt.startedAt > ATTEMPT_MINUTES * 60_000) throw new ContentError(410, 'attempt_expired', `The test must be finished within ${ATTEMPT_MINUTES} minutes. Please start again.`);
    const mapped: Record<string, number> = {};
    for (const [qid, shown] of Object.entries(answers)) {
      const order = attempt.order[qid];
      if (order && Number.isInteger(shown) && shown >= 0 && shown < order.length) mapped[qid] = order[shown];
    }
    return mapped;
  },

  /** Marks an attempt as submitted (only after the result was saved). */
  complete(attemptId: string | undefined) {
    const a = attemptId ? attempts.get(attemptId) : undefined;
    if (a) a.used = true;
  },

  bank: PLACEMENT_BANK,
  reset: () => attempts.clear(),
};
