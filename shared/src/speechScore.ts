// Scoring French speech from a speech-recognition transcript (the browser's fr-FR recogniser).
// It measures what the recogniser understood: if a word was not understood it is marked to retry.
// This is a real, automatic check, but not a phonetic analysis by a trained model or a tutor.
import type { Localized, SpeakingFeedback, SpeakingScenario } from './types';

export const normFr = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/œ/g, 'oe')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const wordsOf = (s: string) => (normFr(s) ? normFr(s).split(' ') : []);

/** Longest-common-subsequence alignment: which target words appear, in order, in what was heard. */
export function alignWords(target: string, heard: string) {
  const t = wordsOf(target);
  const h = wordsOf(heard);
  const dp = Array.from({ length: t.length + 1 }, () => new Array<number>(h.length + 1).fill(0));
  for (let i = t.length - 1; i >= 0; i--) for (let j = h.length - 1; j >= 0; j--) dp[i][j] = t[i] === h[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ok = new Array<boolean>(t.length).fill(false);
  for (let i = 0, j = 0; i < t.length && j < h.length; ) {
    if (t[i] === h[j]) { ok[i] = true; i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  // Show the original spelling of each target word, with its match.
  const display = target.replace(/_/g, ' ').split(/\s+/).filter(Boolean);
  let k = 0;
  const words = display.map((w) => {
    const parts = wordsOf(w);
    const matched = parts.length ? parts.every(() => ok[k++] ?? false) : true;
    return { word: w, ok: matched };
  });
  return { words, matched: ok.filter(Boolean).length, total: t.length };
}

export interface PronunciationScore {
  score: number; // 0–100
  heard: string;
  words: { word: string; ok: boolean }[];
  label: Localized;
}

/** Scores a short phrase: the best of the recogniser's alternatives, lightly weighted by its confidence. */
export function scorePronunciation(target: string, transcripts: string[], confidence?: number): PronunciationScore {
  const candidates = transcripts.length ? transcripts : [''];
  const best = candidates
    .map((heard) => ({ heard, a: alignWords(target, heard) }))
    .sort((x, y) => y.a.matched / Math.max(1, y.a.total) - x.a.matched / Math.max(1, x.a.total))[0];
  const coverage = best.a.total ? best.a.matched / best.a.total : 0;
  const conf = typeof confidence === 'number' && confidence > 0 ? confidence : 0.85;
  const score = Math.round(coverage * (0.8 + 0.2 * conf) * 100);
  const label: Localized =
    score >= 90 ? { en: 'Excellent: clearly understood', fr: 'Excellent : parfaitement compris' }
      : score >= 70 ? { en: 'Good: nearly all words understood', fr: 'Bien : presque tout est compris' }
        : score >= 45 ? { en: 'Almost: retry the red words', fr: 'Presque : reprenez les mots en rouge' }
          : { en: 'Not understood yet: listen and try again', fr: 'Pas encore compris : écoutez et réessayez' };
  return { score, heard: best.heard, words: best.a.words, label };
}

/** Feedback on a free spoken answer to a Speaking Studio scenario. */
export function assessSpokenResponse(scenario: Pick<SpeakingScenario, 'usefulPhrases' | 'highlights'>, transcript: string, seconds: number, confidence?: number): SpeakingFeedback & { used: string[]; missing: string[]; wordCount: number; wpm: number } {
  const said = normFr(transcript);
  const wordCount = wordsOf(transcript).length;
  const wpm = seconds > 0 ? Math.round((wordCount / seconds) * 60) : 0;
  // A useful phrase counts when most of its words appear in order.
  const usesPhrase = (p: string) => {
    const a = alignWords(p, transcript);
    return a.total > 0 && a.matched / a.total >= 0.7;
  };
  const targets = [...new Set([...scenario.usefulPhrases.map((p) => p.fr), ...scenario.highlights])];
  const used = targets.filter(usesPhrase);
  const missing = scenario.usefulPhrases.map((p) => p.fr).filter((p) => !used.includes(p));

  const vocabulary = Math.min(10, Math.round(2 + (used.length / Math.max(1, Math.min(3, targets.length))) * 8));
  const lengthScore = Math.min(1, wordCount / 25);
  const paceScore = wpm >= 70 && wpm <= 160 ? 1 : wpm > 0 ? Math.max(0.4, 1 - Math.abs(wpm - 110) / 150) : 0;
  const fluency = Math.round(10 * (0.6 * lengthScore + 0.4 * paceScore));
  const conf = typeof confidence === 'number' && confidence > 0 ? confidence : null;
  const pronunciation = conf === null ? Math.min(10, Math.max(3, Math.round(4 + lengthScore * 4))) : Math.round(Math.max(2, Math.min(10, conf * 10)));

  const notes: Localized[] = [];
  if (!said) notes.push({ en: 'Nothing was understood. Check your microphone and speak a little closer.', fr: 'Rien n’a été compris. Vérifiez le micro et parlez un peu plus près.' });
  if (used.length) notes.push({ en: `Good use of: ${used.slice(0, 3).map((u) => `“${u}”`).join(', ')}.`, fr: `Bonne utilisation de : ${used.slice(0, 3).map((u) => `« ${u} »`).join(', ')}.` });
  if (missing.length) notes.push({ en: `Next time, try: “${missing[0]}”.`, fr: `La prochaine fois, essayez : « ${missing[0]} ».` });
  if (wordCount > 0 && wordCount < 15) notes.push({ en: `Your answer had ${wordCount} words. Aim for two or three full sentences (20+ words).`, fr: `Votre réponse comptait ${wordCount} mots. Visez deux ou trois phrases complètes (20 mots ou plus).` });
  if (wpm > 165) notes.push({ en: 'You spoke quickly. Slow down a little so every word is clear.', fr: 'Vous avez parlé vite. Ralentissez un peu pour que chaque mot soit clair.' });
  if (wpm > 0 && wpm < 60) notes.push({ en: 'Take your time, but try to link your sentences with fewer pauses.', fr: 'Prenez votre temps, mais essayez d’enchaîner avec moins de pauses.' });
  if (conf === null && said) notes.push({ en: 'Pronunciation is estimated from what was understood; your tutor gives detailed sound feedback.', fr: 'La prononciation est estimée d’après ce qui a été compris ; votre tuteur donne un retour détaillé sur les sons.' });

  return { pronunciation, fluency, vocabulary, notes, simulated: false, used, missing, wordCount, wpm };
}
