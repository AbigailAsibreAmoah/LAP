import { LEARNERS } from '@laporte/shared';

/*
 * Demo classmates (Adwoa, Grace, Kofi…) aren't real people, so nobody would ever type back to
 * them. To show how a conversation feels, they answer: a short pause, the "…is typing" dots,
 * then a friendly line in simple French (A2). Real users (tutors, support, signed-up learners)
 * never get automatic replies.
 */

export const isDemoClassmate = (id: string, me: string) => id !== me && LEARNERS.some((l) => l.id === id);

const GREETING = /^\s*(hi|hey|hello|salut|bonjour|coucou|bonsoir|yo)\b/i;
const THANKS = /\b(merci|thanks|thank you)\b/i;

const REPLIES = {
  greeting: ['Salut ! Ça va ? 😊', 'Bonjour ! Ça fait plaisir. Tu travailles sur quel cours en ce moment ?', 'Coucou ! Tu es prêt·e pour le cours de lundi ?'],
  question: ['Bonne question ! Je pense que oui. On en parle au prochain cours ?', 'Je ne suis pas sûre… On demande à Sophie ?', 'Oui, bien sûr ! Tu veux pratiquer ensemble cette semaine ?'],
  thanks: ['Avec plaisir ! 😊', 'De rien ! Bon courage pour la leçon.'],
  other: ['D’accord, merci ! On pratique ensemble cette semaine ?', 'Super 👍 Bon courage pour le devoir !', 'Ah, intéressant ! Tu peux me l’expliquer en français ?'],
};

let turn = 0;
/** A short reply that fits what was said. */
export function demoReply(text: string) {
  const pool = GREETING.test(text) ? REPLIES.greeting : THANKS.test(text) ? REPLIES.thanks : text.includes('?') ? REPLIES.question : REPLIES.other;
  return pool[turn++ % pool.length];
}

/** How long the classmate "types" for: about a second per 25 characters, 1.6–4 s. */
export const typingTime = (reply: string) => Math.min(4000, Math.max(1600, reply.length * 40));
