// Business rules shared by the API and the offline demo adapter, so both apply them identically.
// Pure functions only: no I/O, no clocks (callers pass "now").
import { nowIso } from './clock';
import type { Booking, CefrLevel, Localized } from './types';

/** @deprecated use nowIso(); kept for compatibility. */
export { nowIso };

/* ---------- Booking policy (discovery brief E6) ---------- */

export const BOOKING_POLICY = {
  /** Free cancellation / rescheduling window before the start time. */
  freeChangeHours: 24,
  /** Learners may join up to this many minutes late; the lesson still ends on time. */
  graceMinutes: 10,
} as const;

export type CancelOutcome =
  | { kind: 'free'; refund: true }
  | { kind: 'late'; refund: false }
  | { kind: 'late-emergency'; refund: false; review: 'pending' };

export function hoursUntil(startIso: string, nowIso: string) {
  return (new Date(startIso).getTime() - new Date(nowIso).getTime()) / 3_600_000;
}

/** What happens to the credit if this booking is cancelled now. */
export function cancellationOutcome(booking: Pick<Booking, 'start'>, nowIso: string, emergency = false): CancelOutcome {
  if (hoursUntil(booking.start, nowIso) >= BOOKING_POLICY.freeChangeHours) return { kind: 'free', refund: true };
  return emergency ? { kind: 'late-emergency', refund: false, review: 'pending' } : { kind: 'late', refund: false };
}

/** Rescheduling is self-service only outside the 24-hour window. */
export function canReschedule(booking: Pick<Booking, 'start'>, nowIso: string) {
  return hoursUntil(booking.start, nowIso) >= BOOKING_POLICY.freeChangeHours;
}

/** Latest time a learner can still join (start + grace). The lesson end does not move. */
export function joinDeadline(booking: Pick<Booking, 'start'>) {
  return new Date(new Date(booking.start).getTime() + BOOKING_POLICY.graceMinutes * 60_000).toISOString();
}

/* ---------- Chat safety: no contact details (brief C1, E7) ---------- */

export type ContactKind = 'email' | 'phone' | 'link' | 'handle';

const CONTACT_PATTERNS: { kind: ContactKind; re: RegExp }[] = [
  { kind: 'email', re: /[a-z0-9._%+-]+\s*(?:@|\(at\)|\[at\]|\sat\s)\s*[a-z0-9.-]+\s*(?:\.|\(dot\)|\[dot\]|\sdot\s)\s*[a-z]{2,}/i },
  // 9+ digits allowing spaces, dots, dashes and brackets, optionally with a + country code (Ghana numbers are 10).
  { kind: 'phone', re: /(?:\+|00)?\d(?:[\s().-]*\d){8,}/ },
  { kind: 'link', re: /\b(?:https?:\/\/|www\.)\S+|\b(?:wa\.me|t\.me|chat\.whatsapp\.com|m\.me|instagram\.com|facebook\.com|linkedin\.com|telegram\.me)\b/i },
  // Social handles, and explicit invitations to move the conversation off the portal.
  { kind: 'handle', re: /(?:^|\s)@[a-z0-9_.]{3,}\b|\b(?:add|text|call|dm|message) me (?:on|at|via)\b|\b(?:my|mon) (?:number|num[ée]ro|whatsapp|telegram|insta(?:gram)?|snap(?:chat)?)\b|\b(?:ajoute|appelle|écris)[- ]moi (?:sur|au|à)\b/i },
];

/** Returns the kinds of contact details found in a message (empty when the message is safe to send). */
export function findContactDetails(text: string): ContactKind[] {
  const normalised = text
    .replace(/[​-‍﻿]/g, '')
    // Dates and times are not phone numbers.
    .replace(/\b\d{4}-\d{2}-\d{2}(?:T[\d:.]+Z?)?\b/g, ' ')
    .replace(/\b\d{1,2}[/.]\d{1,2}[/.]\d{2,4}\b/g, ' ');
  return CONTACT_PATTERNS.filter((p) => p.re.test(normalised)).map((p) => p.kind);
}

export const CONTACT_BLOCK_MESSAGE: Localized = {
  en: 'For everyone’s safety, phone numbers, email addresses, social handles and outside links cannot be shared in portal messages. Keep all contact inside La Porte.',
  fr: 'Pour la sécurité de tous, les numéros de téléphone, adresses e-mail, pseudos et liens externes ne peuvent pas être partagés dans la messagerie. Restez en contact via La Porte.',
};

/* ---------- Placement assessment (brief C1) ---------- */

export const PLACEMENT_LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export interface PlacementQuestion {
  id: string;
  level: CefrLevel;
  skill: 'grammar' | 'vocabulary' | 'reading' | 'listening';
  prompt: string; // French learning material
  context?: string;
  options: string[];
  answer: number;
}

/** Three items per level, A1 → C2. Content is a starter set for the teaching team to refine. */
export const PLACEMENT_QUESTIONS: PlacementQuestion[] = [
  { id: 'p-a1-1', level: 'A1', skill: 'vocabulary', prompt: '« Bonjour, je m’appelle Kofi. Et vous ? » — Quelle est la meilleure réponse ?', options: ['Je m’appelle Ama, enchantée.', 'J’ai vingt ans.', 'Il fait beau.'], answer: 0 },
  { id: 'p-a1-2', level: 'A1', skill: 'grammar', prompt: 'Complétez : « Nous ___ ghanéens. »', options: ['sommes', 'êtes', 'sont'], answer: 0 },
  { id: 'p-a1-3', level: 'A1', skill: 'reading', prompt: 'Panneau : « Fermé le dimanche ». Quand le magasin est-il fermé ?', options: ['Le samedi', 'Le dimanche', 'Le lundi'], answer: 1 },
  { id: 'p-a2-1', level: 'A2', skill: 'grammar', prompt: 'Complétez : « Hier, nous ___ au marché de Makola. »', options: ['allons', 'sommes allés', 'irons'], answer: 1 },
  { id: 'p-a2-2', level: 'A2', skill: 'vocabulary', prompt: 'Au restaurant à Lomé : « L’addition, s’il vous plaît » signifie…', options: ['Le menu, s’il vous plaît', 'La note, s’il vous plaît', 'Une table, s’il vous plaît'], answer: 1 },
  { id: 'p-a2-3', level: 'A2', skill: 'reading', prompt: 'Courriel : « La réunion est reportée à jeudi, 15 h. » Que s’est-il passé ?', options: ['La réunion est annulée.', 'La réunion a changé de date.', 'La réunion commence plus tôt.'], answer: 1 },
  { id: 'p-b1-1', level: 'B1', skill: 'grammar', prompt: 'Complétez : « Si j’avais plus de temps, je ___ le français tous les jours. »', options: ['pratique', 'pratiquerais', 'pratiquerai'], answer: 1 },
  { id: 'p-b1-2', level: 'B1', skill: 'vocabulary', prompt: 'En réunion, pour exprimer poliment un désaccord, on dit :', options: ['C’est faux.', 'Je ne partage pas tout à fait votre avis.', 'Vous avez tort.'], answer: 1 },
  { id: 'p-b1-3', level: 'B1', skill: 'reading', prompt: '« Malgré la hausse des coûts, l’entreprise a maintenu ses prix. » Cela veut dire que…', options: ['les prix ont augmenté', 'les prix n’ont pas changé', 'les coûts ont baissé'], answer: 1 },
  { id: 'p-b2-1', level: 'B2', skill: 'grammar', prompt: 'Complétez : « Bien qu’il ___ en retard, la délégation l’a attendu. »', options: ['est', 'soit', 'était'], answer: 1 },
  { id: 'p-b2-2', level: 'B2', skill: 'vocabulary', prompt: '« Ce projet est à double tranchant » signifie qu’il…', options: ['a des avantages et des risques', 'coûte deux fois plus cher', 'est presque terminé'], answer: 0 },
  { id: 'p-b2-3', level: 'B2', skill: 'reading', prompt: '« Le ministère n’exclut pas de revoir sa position. » Le ministère…', options: ['refuse tout changement', 'pourrait changer d’avis', 'a déjà changé d’avis'], answer: 1 },
  { id: 'p-c1-1', level: 'C1', skill: 'grammar', prompt: 'Complétez : « Quelles que ___ les difficultés, le projet sera mené à terme. »', options: ['sont', 'soient', 'seront'], answer: 1 },
  { id: 'p-c1-2', level: 'C1', skill: 'vocabulary', prompt: '« Il n’en demeure pas moins que… » sert à…', options: ['maintenir un argument malgré une objection', 'conclure un accord', 'changer de sujet'], answer: 0 },
  { id: 'p-c1-3', level: 'C1', skill: 'reading', prompt: '« Loin de freiner la croissance, la réforme l’a stimulée. » Selon la phrase, la réforme…', options: ['a ralenti la croissance', 'a favorisé la croissance', 'n’a eu aucun effet'], answer: 1 },
  { id: 'p-c2-1', level: 'C2', skill: 'grammar', prompt: 'Quelle phrase est correcte en registre soutenu ?', options: ['Eussé-je su, je serais venu.', 'Si j’aurais su, je serais venu.', 'Si je savais, je serais venu hier.'], answer: 0 },
  { id: 'p-c2-2', level: 'C2', skill: 'vocabulary', prompt: '« Ménager la chèvre et le chou » signifie…', options: ['s’occuper d’une ferme', 'chercher à ne mécontenter aucune des deux parties', 'prendre une décision radicale'], answer: 1 },
  { id: 'p-c2-3', level: 'C2', skill: 'reading', prompt: '« Ce rapport, pour exhaustif qu’il soit, élude la question du financement. » Le rapport…', options: ['est complet et traite tout', 'est détaillé mais évite un point essentiel', 'est trop court'], answer: 1 },
];

/** Real situations a learner can say they need French for (brief A1, A8). */
export const LEARNING_GOALS = {
  meetings: { en: 'Professional meetings', fr: 'Réunions professionnelles' },
  negotiations: { en: 'Business negotiations', fr: 'Négociations commerciales' },
  presentations: { en: 'Presentations', fr: 'Présentations' },
  interviews: { en: 'Job interviews', fr: 'Entretiens d’embauche' },
  diplomacy: { en: 'Diplomacy & international relations', fr: 'Diplomatie et relations internationales' },
  travel: { en: 'Travel & relocation', fr: 'Voyages et expatriation' },
  everyday: { en: 'Everyday conversation', fr: 'Conversation courante' },
  exams: { en: 'DELF / TCF / TEF exams', fr: 'Examens DELF / TCF / TEF' },
} satisfies Record<string, Localized>;
export type LearningGoalId = keyof typeof LEARNING_GOALS;

/** Which course best serves each goal (ids from COURSES). */
const GOAL_COURSE: Record<LearningGoalId, string> = {
  meetings: 'crs-business',
  negotiations: 'crs-trade',
  presentations: 'crs-business',
  interviews: 'crs-career',
  diplomacy: 'crs-diplomacy',
  travel: 'crs-everyday',
  everyday: 'crs-conversation',
  exams: 'crs-exams',
};

export interface PlacementInput {
  answers: Record<string, number>;
  writingSample: string;
  goals: LearningGoalId[];
  hoursPerWeek: number;
  preferredTimes: ('morning' | 'lunch' | 'evening' | 'weekend')[];
}

export interface PlacementResult extends PlacementInput {
  id: string;
  learnerId: string;
  takenAt: string;
  level: CefrLevel;
  scores: Record<string, { correct: number; total: number }>;
  plan: {
    courseIds: string[];
    weeklySelfPacedMinutes: number;
    weeklyLiveSessions: number;
    focus: Localized[];
    firstSteps: Localized[];
  };
  /** The writing sample is reviewed by a tutor; the level stays provisional until then. */
  reviewedBy?: string;
}

/** Level = highest band passed (≥ 2 of 3) with every lower band also passed. */
export function scorePlacement(answers: Record<string, number>) {
  const scores: Record<string, { correct: number; total: number }> = {};
  for (const lvl of PLACEMENT_LEVELS) {
    const qs = PLACEMENT_QUESTIONS.filter((q) => q.level === lvl);
    scores[lvl] = { correct: qs.filter((q) => answers[q.id] === q.answer).length, total: qs.length };
  }
  let level: CefrLevel = 'A1';
  for (const lvl of PLACEMENT_LEVELS) {
    if (scores[lvl].correct >= 2) level = lvl;
    else break;
  }
  return { level, scores };
}

export function buildPlacementResult(input: PlacementInput, ctx: { id: string; learnerId: string; takenAt: string }): PlacementResult {
  const { level, scores } = scorePlacement(input.answers);
  const goals = input.goals.length ? input.goals : (['everyday'] as LearningGoalId[]);
  const courseIds = [...new Set(goals.map((g) => GOAL_COURSE[g]))].slice(0, 3);
  // Two-thirds of the learner's time goes to self-paced work; one 45–60 min live session per ~2.5 h.
  const minutes = Math.round(input.hoursPerWeek * 60);
  const weeklyLiveSessions = Math.max(1, Math.min(4, Math.round(input.hoursPerWeek / 2.5)));
  const weeklySelfPacedMinutes = Math.max(30, minutes - weeklyLiveSessions * 45);
  const focus = goals.map((g) => LEARNING_GOALS[g]);
  const firstSteps: Localized[] = [
    { en: `Start at ${level}: open the first lesson of your recommended course.`, fr: `Commencez au niveau ${level} : ouvrez la première leçon du cours recommandé.` },
    { en: `Book ${weeklyLiveSessions} immersion session${weeklyLiveSessions > 1 ? 's' : ''} a week, ${input.preferredTimes.length ? 'at your preferred times' : 'at times that suit you'}.`, fr: `Réservez ${weeklyLiveSessions} séance${weeklyLiveSessions > 1 ? 's' : ''} d’immersion par semaine${input.preferredTimes.length ? ' à vos horaires préférés' : ''}.` },
    { en: 'Your tutor reviews your writing sample and confirms your level.', fr: 'Votre tuteur relit votre texte et confirme votre niveau.' },
  ];
  return { ...input, goals, ...ctx, level, scores, plan: { courseIds, weeklySelfPacedMinutes, weeklyLiveSessions, focus, firstSteps } };
}
