// Level-based course access.
// A learner studies only the content of their level: the one the placement test gave them (A1 if
// they skipped it, or the level a tutor confirmed). Nothing below or above is open. When they are
// ready (e.g. done with C1), they buy the next level; levels they have bought stay open.
import { MEMBERSHIP_PLANS } from './demo-data';
import type { CefrLevel, Course, Learner, Localized } from './types';

export const LEVEL_ORDER: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
export const levelIndex = (l: CefrLevel) => LEVEL_ORDER.indexOf(l);
export const maxLevel = (a: CefrLevel, b?: CefrLevel) => (b && levelIndex(b) > levelIndex(a) ? b : a);

/** The highest level this learner may study: placement level, raised by any level they bought. */
export const accessLevel = (learner: Pick<Learner, 'level' | 'unlockedLevel'>) => maxLevel(learner.level, learner.unlockedLevel);

/** Open levels run from the placement level up to the highest level bought. */
export const openLevels = (learner: Pick<Learner, 'level' | 'unlockedLevel'>) => LEVEL_ORDER.slice(levelIndex(learner.level), levelIndex(accessLevel(learner)) + 1);

export const canStudy = (learner: Pick<Learner, 'level' | 'unlockedLevel'>, level: CefrLevel) => levelIndex(level) >= levelIndex(learner.level) && levelIndex(level) <= levelIndex(accessLevel(learner));

/** "A2–C1" → ['A2', 'C1']. */
export function courseRange(course: Pick<Course, 'levels'>): [CefrLevel, CefrLevel] {
  const found = (course.levels.match(/[ABC][12]/g) ?? ['A1']) as CefrLevel[];
  return [found[0], found[found.length - 1]];
}

/** A course is shown when it covers one of the learner's open levels; only those lessons open. */
export function courseOpen(learner: Pick<Learner, 'level' | 'unlockedLevel'>, course: Pick<Course, 'levels'>) {
  const [from, to] = courseRange(course);
  return levelIndex(from) <= levelIndex(accessLevel(learner)) && levelIndex(to) >= levelIndex(learner.level);
}

export const nextLevel = (l: CefrLevel): CefrLevel | null => LEVEL_ORDER[levelIndex(l) + 1] ?? null;

/* ---------- Buying the next level ---------- */

export const LEVEL_PRODUCT_PREFIX = 'level-';
/** Demo price for unlocking one level's courses (GH₵); La Porte sets the real price. */
export const LEVEL_UNLOCK_PRICE_GHS = 450;

export interface LevelProduct {
  id: string;
  level: CefrLevel;
  name: Localized;
  demoPriceGhs: number;
  credits: 0;
}

export function levelProduct(id: string): LevelProduct | null {
  if (!id.startsWith(LEVEL_PRODUCT_PREFIX)) return null;
  const level = id.slice(LEVEL_PRODUCT_PREFIX.length) as CefrLevel;
  if (!LEVEL_ORDER.includes(level) || level === 'A1') return null;
  return { id, level, name: { en: `${level} level courses`, fr: `Cours du niveau ${level}` }, demoPriceGhs: LEVEL_UNLOCK_PRICE_GHS, credits: 0 };
}

export const levelProductId = (level: CefrLevel) => `${LEVEL_PRODUCT_PREFIX}${level}`;

/** Levels are bought one at a time, in order: only the next level up can be purchased. */
export function canBuyLevel(learner: Pick<Learner, 'level' | 'unlockedLevel'>, level: CefrLevel) {
  return nextLevel(accessLevel(learner)) === level;
}

/** Name of what a payment bought: a membership plan or a level. */
export function productName(id: string): Localized {
  return MEMBERSHIP_PLANS.find((p) => p.id === id)?.name ?? levelProduct(id)?.name ?? { en: id, fr: id };
}
