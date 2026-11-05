// Spaced repetition for the learner's vocabulary (Leitner boxes).
// Each review moves a word to a box; the box decides when it comes back. Words you know come
// back rarely, words you miss come back tomorrow, so a few minutes a day keeps them all fresh.
import { ContentError, type ContentState, type ContentUser } from './content';
import type { Localized, VocabEntry } from './types';

type Ctx = { user: ContentUser; now: string; newId: (prefix: string) => string };

/** Days until the next review, by box. */
export const REVIEW_INTERVALS = [0, 1, 3, 7, 16, 35] as const;
export const MAX_BOX = REVIEW_INTERVALS.length - 1;
/** New words introduced per day, so the daily deck stays small. */
export const NEW_WORDS_PER_DAY = 8;
export const DAILY_REVIEW_GOAL = 10;

export type ReviewGrade = 'again' | 'hard' | 'good' | 'easy';
export const REVIEW_GRADES: { id: ReviewGrade; label: Localized }[] = [
  { id: 'again', label: { en: 'Again', fr: 'À revoir' } },
  { id: 'hard', label: { en: 'Hard', fr: 'Difficile' } },
  { id: 'good', label: { en: 'Good', fr: 'Bien' } },
  { id: 'easy', label: { en: 'Easy', fr: 'Facile' } },
];

export interface VocabReview {
  learnerId: string;
  vocabId: string;
  box: number;
  dueOn: string; // YYYY-MM-DD
  reps: number;
  lapses: number;
  lastAt: string;
}

/** Reviews done per learner per day (for the streak and the daily goal). */
export interface ReviewDay {
  learnerId: string;
  day: string;
  count: number;
}

const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export function nextReview(current: Pick<VocabReview, 'box'> | undefined, grade: ReviewGrade, today: string) {
  const box = current?.box ?? 0;
  const nextBox = grade === 'again' ? 0 : grade === 'hard' ? Math.max(1, box) : grade === 'good' ? Math.min(MAX_BOX, box + 1) : Math.min(MAX_BOX, box + 2);
  // "Again" comes back today (later in the session); everything else waits its interval.
  const days = grade === 'again' ? 0 : grade === 'hard' ? Math.max(1, Math.round(REVIEW_INTERVALS[nextBox] / 2)) : REVIEW_INTERVALS[nextBox];
  return { box: nextBox, dueOn: addDays(today, days), days };
}

/** Today's deck: words due for review first, then up to the daily number of new words. */
export function dueToday(vocab: VocabEntry[], state: Pick<ContentState, 'vocabReviews' | 'reviewDays'>, learnerId: string, today: string) {
  const mine = new Map(state.vocabReviews.filter((r) => r.learnerId === learnerId).map((r) => [r.vocabId, r]));
  const introducedToday = state.vocabReviews.filter((r) => r.learnerId === learnerId && r.reps === 1 && r.lastAt.startsWith(today)).length;
  const due = vocab.filter((v) => mine.has(v.id) && mine.get(v.id)!.dueOn <= today).sort((a, b) => mine.get(a.id)!.dueOn.localeCompare(mine.get(b.id)!.dueOn));
  const fresh = vocab.filter((v) => !mine.has(v.id)).slice(0, Math.max(0, NEW_WORDS_PER_DAY - introducedToday));
  return { due, fresh, deck: [...due, ...fresh], reviewedToday: state.reviewDays.find((d) => d.learnerId === learnerId && d.day === today)?.count ?? 0 };
}

/** Consecutive days (ending today, or yesterday if today has no review yet) with at least one review. */
export function reviewStreak(state: Pick<ContentState, 'reviewDays'>, learnerId: string, today: string) {
  const days = new Set(state.reviewDays.filter((d) => d.learnerId === learnerId && d.count > 0).map((d) => d.day));
  let day = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

export const reviewOps = {
  reviewWord(state: ContentState, ctx: Ctx, vocabId: string, grade: ReviewGrade) {
    if (ctx.user.role !== 'learner') throw new ContentError(403, 'forbidden', 'Only learners review their vocabulary.');
    if (!REVIEW_GRADES.some((g) => g.id === grade)) throw new ContentError(422, 'invalid_grade', 'Choose how well you knew it.');
    const today = ctx.now.slice(0, 10);
    const next = structuredClone(state);
    const existing = next.vocabReviews.find((r) => r.learnerId === ctx.user.id && r.vocabId === vocabId);
    const plan = nextReview(existing, grade, today);
    const review: VocabReview = { learnerId: ctx.user.id, vocabId, box: plan.box, dueOn: plan.dueOn, reps: (existing?.reps ?? 0) + 1, lapses: (existing?.lapses ?? 0) + (grade === 'again' && existing ? 1 : 0), lastAt: ctx.now };
    next.vocabReviews = [...next.vocabReviews.filter((r) => !(r.learnerId === ctx.user.id && r.vocabId === vocabId)), review];
    const day = next.reviewDays.find((d) => d.learnerId === ctx.user.id && d.day === today);
    if (day) day.count += 1;
    else next.reviewDays.push({ learnerId: ctx.user.id, day: today, count: 1 });
    return { state: next, review, days: plan.days };
  },
};
