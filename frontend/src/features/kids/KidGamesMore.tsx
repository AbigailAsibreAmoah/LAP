import { seededShuffle, type KidUnit, type KidWord } from '@laporte/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { spring } from '../../components/animations/motion';
import { useI18n } from '../../i18n/I18nProvider';
import { speakFrench } from '../../utils/speech';
import type { Finish } from './KidGames';

const say = (text: string, done: () => void = () => undefined) => speakFrench(text.replace('…', ''), done, 0.8);
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, ' ').replace(/[^a-z\s-]/g, ' ').replace(/\s+/g, ' ').trim();
const ARTICLES = /^(le|la|les|l|un|une)\s+/;

/** Little burst of La Porte-coloured confetti for a 3-star finish (CSS-only, respects reduced motion). */
export function Confetti() {
  const bits = useMemo(() => Array.from({ length: 28 }, (_, i) => ({ left: (i * 37) % 100, delay: (i % 7) * 0.08, hue: ['#6e1630', '#c49a5a', '#141b34', '#1f6b4f', '#e7c78f'][i % 5], rot: (i * 47) % 360 })), []);
  return (
    <div className="kg-confetti" aria-hidden>
      {bits.map((b, i) => <span key={i} style={{ left: `${b.left}%`, animationDelay: `${b.delay}s`, background: b.hue, transform: `rotate(${b.rot}deg)` }} />)}
    </div>
  );
}

/* ---------- Learn the words: tap to hear, then repeat ---------- */

export function LearnWords({ unit }: { unit: KidUnit }) {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const [heard, setHeard] = useState<string[]>([]);
  const [playing, setPlaying] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const stop = useRef(false);
  useEffect(() => () => { stop.current = true; }, []);

  const hear = (w: KidWord) => {
    setPlaying(w.fr);
    setHeard((h) => (h.includes(w.fr) ? h : [...h, w.fr]));
    say(w.fr, () => setPlaying((p) => (p === w.fr ? null : p)));
  };
  // "Hear them all": plays every word in turn, like a teacher reading the list.
  const playAll = () => {
    setAll(true);
    stop.current = false;
    const run = (i: number) => {
      if (stop.current || i >= unit.words.length) {
        setAll(false);
        setPlaying(null);
        return;
      }
      const w = unit.words[i];
      setPlaying(w.fr);
      setHeard((h) => (h.includes(w.fr) ? h : [...h, w.fr]));
      say(w.fr, () => window.setTimeout(() => run(i + 1), 650));
    };
    run(0);
  };

  return (
    <section className="kid-card-big" aria-labelledby={`learn-${unit.id}`}>
      <div className="row between" style={{ alignItems: 'center' }}>
        <div>
          <h2 id={`learn-${unit.id}`} className="kid-h2" lang="fr">📖 Découvre les mots</h2>
          <p className="kid-sub">{fr ? 'Touche un mot pour l’écouter, puis répète-le à voix haute.' : 'Tap a word to hear it, then say it out loud.'}</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => (all ? (stop.current = true) : playAll())}>{all ? (fr ? '⏸ Stop' : '⏸ Stop') : fr ? '▶ Tout écouter' : '▶ Hear them all'}</button>
      </div>
      <div className="kid-learn">
        {unit.words.map((w) => (
          <motion.button key={w.fr} type="button" className="kid-learn-card" data-on={playing === w.fr || undefined} data-heard={heard.includes(w.fr) || undefined} whileTap={{ scale: 0.95 }} onClick={() => hear(w)}>
            <span className="kid-learn-emoji" aria-hidden>{w.emoji}</span>
            <strong lang="fr">{w.fr}</strong>
            <span className="tiny">{w.en}</span>
            {heard.includes(w.fr) && <span className="kid-learn-tick" aria-label={fr ? 'écouté' : 'heard'}>✓</span>}
          </motion.button>
        ))}
      </div>
      <p className="tiny muted" style={{ marginTop: 10 }}>{fr ? `${heard.length}/${unit.words.length} mots écoutés · ensuite, joue pour gagner des étoiles !` : `${heard.length}/${unit.words.length} words heard · then play to win stars!`}</p>
    </section>
  );
}

/* ---------- Dis-le ! Say the word out loud ---------- */

type Recognition = { lang: string; interimResults: boolean; maxAlternatives: number; start: () => void; abort: () => void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null };
const RecognitionCtor = (): (new () => Recognition) | undefined => {
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

/** True when what was heard contains the word (accents, articles and case ignored). */
export function heardWord(heard: string[], target: KidWord) {
  const want = [norm(target.fr), norm(target.fr).replace(ARTICLES, ''), norm(target.word)];
  return heard.some((h) => {
    const got = norm(h);
    return want.some((x) => x && (got === x || got.split(' ').includes(x) || got.includes(x)));
  });
}

export function SpeakGame({ unit, onFinish, onExit }: { unit: KidUnit; onFinish: Finish; onExit: () => void }) {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const [round, setRound] = useState(0);
  const words = useMemo(() => seededShuffle(unit.words, round * 13 + 7).slice(0, 5), [unit, round]);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [tries, setTries] = useState(0);
  const [state, setState] = useState<'ready' | 'listening' | 'right' | 'again' | 'reveal'>('ready');
  const [heard, setHeard] = useState('');
  const [done, setDone] = useState(false);
  const [micOff, setMicOff] = useState(() => !RecognitionCtor());
  const rec = useRef<Recognition | null>(null);
  const target = words[i];

  useEffect(() => () => rec.current?.abort(), []);

  const listen = () => {
    const Ctor = RecognitionCtor();
    if (!Ctor) return setMicOff(true);
    const r = new Ctor();
    rec.current = r;
    r.lang = 'fr-FR';
    r.interimResults = false;
    r.maxAlternatives = 5;
    let got = false;
    r.onresult = (e) => {
      got = true;
      const alts = Array.from(e.results[0] as ArrayLike<{ transcript: string }>).map((a) => a.transcript);
      setHeard(alts[0] ?? '');
      if (heardWord(alts, target)) {
        setState('right');
        if (tries === 0) setScore((n) => n + 1);
        say('Bravo !');
      } else {
        setTries((t) => t + 1);
        setState(tries >= 1 ? 'reveal' : 'again');
      }
    };
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setMicOff(true);
      setState('ready');
    };
    r.onend = () => {
      if (!got) setState((s) => (s === 'listening' ? 'ready' : s));
    };
    setHeard('');
    setState('listening');
    r.start();
  };

  const next = () => {
    if (i + 1 >= words.length) {
      setDone(true);
      onFinish(score, words.length);
    } else {
      setI(i + 1);
      setTries(0);
      setHeard('');
      setState('ready');
    }
  };

  if (done)
    return (
      <div className="kg-end">
        <div className="kg-end-burst" aria-hidden>🎤</div>
        <h3 lang="fr">{score === words.length ? 'Tu parles super bien !' : 'Bien parlé !'}</h3>
        <p>{fr ? `${score} sur ${words.length} du premier coup` : `${score} out of ${words.length} first time`}</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn btn-ghost" onClick={() => { setRound((r) => r + 1); setI(0); setScore(0); setTries(0); setState('ready'); setDone(false); }}>{fr ? 'Rejouer' : 'Play again'}</button>
          <button className="btn btn-brand" onClick={onExit}>{fr ? 'Continuer' : 'Continue'}</button>
        </div>
      </div>
    );

  return (
    <div className="kg-play">
      <div className="kg-hud"><span>{i + 1}/{words.length}</span><span className="kg-points">{score} ★</span></div>
      <div className="kg-question">
        <motion.span key={target.fr} className="kg-big-emoji" initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={spring.bouncy}>{target.emoji}</motion.span>
        <h3 lang="fr">{target.fr}</h3>
        <span className="tiny muted">{target.en}</span>
        <button className="kg-listen-btn" onClick={() => say(target.fr)} aria-label={fr ? 'Écouter' : 'Listen'}>🔊</button>
      </div>

      {micOff ? (
        <div className="kg-feedback" data-ok={state === 'right' || undefined}>
          <strong>{fr ? 'Écoute, puis dis-le à voix haute' : 'Listen, then say it out loud'}</strong>
          <span className="tiny">{fr ? 'Le micro n’est pas disponible ici : un grand peut vérifier.' : 'The microphone isn’t available here: a grown-up can check.'}</span>
          {state === 'right' ? (
            <button className="btn btn-brand" autoFocus onClick={next}>{fr ? 'Suivant' : 'Next'}</button>
          ) : (
            <div className="row" style={{ justifyContent: 'center' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => { setTries(1); next(); }}>{fr ? 'Pas encore' : 'Not yet'}</button>
              <button className="btn btn-brand" onClick={() => { setScore((n) => n + 1); setState('right'); say('Bravo !'); }}>{fr ? 'Je l’ai dit ! ✓' : 'I said it! ✓'}</button>
            </div>
          )}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={state} className="kg-speak" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {(state === 'ready' || state === 'again') && (
              <>
                {state === 'again' && <p className="kg-speak-msg" lang="fr">Presque ! J’ai entendu « {heard} ». Essaie encore 💪</p>}
                <button className="kg-mic" onClick={listen} aria-label={fr ? 'Parler' : 'Speak'}>🎤</button>
                <span className="small">{fr ? 'Touche le micro et dis le mot' : 'Tap the mic and say the word'}</span>
              </>
            )}
            {state === 'listening' && (
              <>
                <span className="kg-mic" data-live aria-hidden>🎤</span>
                <span className="small">{fr ? 'Je t’écoute…' : 'Listening…'}</span>
              </>
            )}
            {state === 'right' && (
              <div className="kg-feedback" data-ok>
                <strong lang="fr">Bravo ! {tries === 0 ? '+1 ★' : ''}</strong>
                <span className="tiny" lang="fr">« {heard} »</span>
                <button className="btn btn-brand" autoFocus onClick={next}>{fr ? 'Suivant' : 'Next'}</button>
              </div>
            )}
            {state === 'reveal' && (
              <div className="kg-feedback">
                <strong lang="fr">On réécoute ensemble 🔊</strong>
                <span className="tiny" lang="fr">{fr ? `Le mot est « ${target.fr} ».` : `The word is “${target.fr}”.`}</span>
                <div className="row" style={{ justifyContent: 'center' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => say(target.fr)}>🔊 {fr ? 'Écouter' : 'Listen'}</button>
                  <button className="btn btn-brand" onClick={next}>{fr ? 'Suivant' : 'Next'}</button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
