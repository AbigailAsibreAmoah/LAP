import { answerPoints, listenFor, quizFor, seededShuffle, starsFor, type KidQuestion, type KidUnit, type LiveGameView } from '@laporte/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { spring } from '../../components/animations/motion';
import { useI18n } from '../../i18n/I18nProvider';
import { speakFrench } from '../../utils/speech';

/*
 * La Porte Kids mini-games. Original designs in La Porte's colours: answers are marked A–D on
 * burgundy, navy, gold and green tiles. Every game ends with onFinish(score, total).
 */

export type Finish = (score: number, total: number) => void;
const MARKERS = ['A', 'B', 'C', 'D'];
const say = (text: string, done: () => void = () => undefined) => speakFrench(text.replace('…', ''), done, 0.8);

export function Stars({ n, size = 22 }: { n: number; size?: number }) {
  return (
    <span className="kg-stars" aria-label={`${n}/3`} style={{ fontSize: size }}>
      {[0, 1, 2].map((i) => <span key={i} data-on={i < n || undefined}>★</span>)}
    </span>
  );
}

function useCountdown(seconds: number, running: boolean, key: unknown) {
  const [left, setLeft] = useState(seconds * 1000);
  const start = useRef(Date.now());
  useEffect(() => {
    start.current = Date.now();
    setLeft(seconds * 1000);
  }, [key, seconds]);
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setLeft(Math.max(0, seconds * 1000 - (Date.now() - start.current))), 100);
    return () => window.clearInterval(t);
  }, [running, seconds, key]);
  return { left, elapsed: seconds * 1000 - left };
}

export function TimerBar({ left, total }: { left: number; total: number }) {
  const pct = Math.max(0, Math.min(100, (left / total) * 100));
  return (
    <div className="kg-timer" role="timer" aria-label={`${Math.ceil(left / 1000)} s`}>
      <span style={{ width: `${pct}%` }} data-low={pct < 30 || undefined} />
      <b>{Math.ceil(left / 1000)}</b>
    </div>
  );
}

/** Big A–D answer tiles, shared by the solo quiz, listening and live games. */
export function AnswerTiles({ q, picked, reveal, onPick, disabled }: { q: Pick<KidQuestion, 'options' | 'answer'>; picked: number | null; reveal: boolean; onPick: (i: number) => void; disabled?: boolean }) {
  return (
    <div className="kg-tiles" data-count={q.options.length}>
      {q.options.map((o, i) => {
        const state = reveal ? (i === q.answer ? 'right' : i === picked ? 'wrong' : 'dim') : picked === i ? 'picked' : undefined;
        return (
          <motion.button key={i} type="button" className="kg-tile" data-i={i} data-state={state} disabled={disabled || picked !== null} onClick={() => onPick(i)} whileTap={{ scale: 0.96 }}>
            <span className="kg-marker" aria-hidden>{MARKERS[i]}</span>
            {o.emoji && <span className="kg-tile-emoji" aria-hidden>{o.emoji}</span>}
            <span lang="fr">{o.label}</span>
            {reveal && i === q.answer && <span className="kg-tick" aria-label="correct">✓</span>}
          </motion.button>
        );
      })}
    </div>
  );
}

function EndCard({ score, total, points, onAgain, onDone }: { score: number; total: number; points?: number; onAgain: () => void; onDone: () => void }) {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const stars = starsFor(score, total);
  const cheer = stars === 3 ? 'Bravo, champion !' : stars === 2 ? 'Très bien !' : 'Bien essayé !';
  return (
    <motion.div className="kg-end" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring.bouncy}>
      <div className="kg-end-burst" aria-hidden>🎉</div>
      <h3 lang="fr">{cheer}</h3>
      <Stars n={stars} size={40} />
      <p>{fr ? `${score} sur ${total}` : `${score} out of ${total}`}{points !== undefined ? ` · ${points} pts` : ''}</p>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn btn-ghost" onClick={onAgain}>{fr ? 'Rejouer' : 'Play again'}</button>
        <button className="btn btn-brand" onClick={onDone}>{fr ? 'Continuer' : 'Continue'}</button>
      </div>
    </motion.div>
  );
}

/* ---------- Le Grand Quiz (solo): 15 s per question, speed points, streaks ---------- */

export function QuizGame({ unit, onFinish, onExit }: { unit: KidUnit; onFinish: Finish; onExit: () => void }) {
  const { l, lang } = useI18n();
  const fr = lang === 'fr';
  const [round, setRound] = useState(0);
  const questions = useMemo(() => quizFor(unit, (round + 1) * 97 + Date.now() % 50, 6), [unit, round]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [gain, setGain] = useState(0);
  const [done, setDone] = useState(false);
  const SEC = 15;
  const q = questions[i];
  const revealed = picked !== null;
  const { left, elapsed } = useCountdown(SEC, !revealed && !done, `${round}-${i}`);

  useEffect(() => {
    if (!revealed && left === 0 && !done) setPicked(-1); // time up
  }, [left, revealed, done]);

  const pick = (choice: number) => {
    if (revealed) return;
    const correct = choice === q.answer;
    const p = answerPoints(correct, elapsed, SEC * 1000, streak);
    setPicked(choice);
    setGain(p);
    setPoints((n) => n + p);
    setStreak((s) => (correct ? s + 1 : 0));
    if (correct) setScore((n) => n + 1);
  };
  const next = () => {
    if (i + 1 >= questions.length) {
      setDone(true);
      onFinish(score, questions.length);
    } else {
      setI(i + 1);
      setPicked(null);
    }
  };
  const again = () => {
    setRound((r) => r + 1);
    setI(0);
    setPicked(null);
    setScore(0);
    setPoints(0);
    setStreak(0);
    setDone(false);
  };

  if (done) return <EndCard score={score} total={questions.length} points={points} onAgain={again} onDone={onExit} />;
  return (
    <div className="kg-play">
      <div className="kg-hud">
        <span>{fr ? 'Question' : 'Question'} {i + 1}/{questions.length}</span>
        {streak > 1 && <span className="kg-streak">🔥 {streak}</span>}
        <span className="kg-points">{points} pts</span>
      </div>
      <TimerBar left={revealed ? 0 : left} total={SEC * 1000} />
      <div className="kg-question">
        {q.emoji && <motion.span key={q.id} className="kg-big-emoji" initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={spring.bouncy}>{q.emoji}</motion.span>}
        <h3 lang="fr">{q.prompt}</h3>
        {q.say && !q.emoji && <button className="kg-listen-btn" onClick={() => say(q.say!)} aria-label={fr ? 'Écouter' : 'Listen'}>🔊</button>}
      </div>
      <AnswerTiles q={q} picked={picked} reveal={revealed} onPick={pick} />
      <AnimatePresence>
        {revealed && (
          <motion.div className="kg-feedback" data-ok={picked === q.answer || undefined} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <strong lang="fr">{picked === q.answer ? `Super ! +${gain}` : picked === -1 ? (fr ? 'Temps écoulé !' : 'Time’s up!') : 'Oups !'}</strong>
            <span>{l(q.explain)}</span>
            <button className="btn btn-brand" onClick={next} autoFocus>{i + 1 >= questions.length ? (fr ? 'Voir mon score' : 'See my score') : fr ? 'Suivant' : 'Next'}</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- Listen & pick ---------- */

export function ListenGame({ unit, onFinish, onExit }: { unit: KidUnit; onFinish: Finish; onExit: () => void }) {
  const { l, lang } = useI18n();
  const fr = lang === 'fr';
  const [round, setRound] = useState(0);
  const questions = useMemo(() => listenFor(unit, round * 31 + 3), [unit, round]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const q = questions[i];

  useEffect(() => {
    if (!done && q?.say) say(q.say);
  }, [q, done]);

  if (done) return <EndCard score={score} total={questions.length} onAgain={() => { setRound((r) => r + 1); setI(0); setPicked(null); setScore(0); setDone(false); }} onDone={onExit} />;
  return (
    <div className="kg-play">
      <div className="kg-hud"><span>{i + 1}/{questions.length}</span><span className="kg-points">{score} ★</span></div>
      <div className="kg-question">
        <button className="kg-listen-big" onClick={() => say(q.say!)} aria-label={fr ? 'Écouter encore' : 'Listen again'}>🔊</button>
        <h3>{fr ? 'Écoute et touche la bonne image' : 'Listen and tap the right picture'}</h3>
      </div>
      <AnswerTiles q={q} picked={picked} reveal={picked !== null} onPick={(c) => { setPicked(c); if (c === q.answer) setScore((n) => n + 1); }} />
      {picked !== null && (
        <div className="kg-feedback" data-ok={picked === q.answer || undefined}>
          <strong lang="fr">{picked === q.answer ? 'Bravo !' : 'Presque !'}</strong>
          <span>{l(q.explain)}</span>
          <button className="btn btn-brand" autoFocus onClick={() => { if (i + 1 >= questions.length) { setDone(true); onFinish(score, questions.length); } else { setI(i + 1); setPicked(null); } }}>{fr ? 'Suivant' : 'Next'}</button>
        </div>
      )}
    </div>
  );
}

/* ---------- Memory: match each picture with its French word ---------- */

export function MemoryGame({ unit, onFinish, onExit }: { unit: KidUnit; onFinish: Finish; onExit: () => void }) {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const [round, setRound] = useState(0);
  const cards = useMemo(() => seededShuffle(unit.words.flatMap((word, k) => [{ key: `${k}-p`, pair: k, face: word.emoji, pic: true, fr: word.fr }, { key: `${k}-w`, pair: k, face: word.fr, pic: false, fr: word.fr }]), round * 17 + 5), [unit, round]);
  const [open, setOpen] = useState<number[]>([]);
  const [found, setFound] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const pairs = unit.words.length;
  const done = found.length === pairs;
  const score = Math.max(2, pairs - Math.max(0, Math.floor((moves - pairs - 2) / 2)));

  useEffect(() => {
    if (open.length !== 2) return;
    const [a, b] = open.map((x) => cards[x]);
    if (a.pair === b.pair) {
      say(a.fr);
      setFound((f) => [...f, a.pair]);
      setOpen([]);
    } else {
      const t = window.setTimeout(() => setOpen([]), 900);
      return () => window.clearTimeout(t);
    }
  }, [open, cards]);
  useEffect(() => {
    if (done) onFinish(score, pairs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  if (done) return <EndCard score={score} total={pairs} onAgain={() => { setRound((r) => r + 1); setOpen([]); setFound([]); setMoves(0); }} onDone={onExit} />;
  return (
    <div className="kg-play">
      <div className="kg-hud"><span>{fr ? 'Paires' : 'Pairs'} {found.length}/{pairs}</span><span>{fr ? 'Coups' : 'Moves'} {moves}</span></div>
      <div className="kg-memory">
        {cards.map((c, idx) => {
          const shown = open.includes(idx) || found.includes(c.pair);
          return (
            <button key={c.key} type="button" className="kg-card" data-shown={shown || undefined} data-found={found.includes(c.pair) || undefined} disabled={shown || open.length === 2} aria-label={shown ? c.face : fr ? 'Carte cachée' : 'Hidden card'}
              onClick={() => { setOpen((o) => [...o, idx]); if (open.length === 1) setMoves((m) => m + 1); }}>
              <span className="kg-card-inner">
                <span className="kg-card-back" aria-hidden>?</span>
                <span className="kg-card-face" data-pic={c.pic || undefined} lang="fr">{c.face}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Word builder: tap the letters in order ---------- */

export function BuilderGame({ unit, onFinish, onExit }: { unit: KidUnit; onFinish: Finish; onExit: () => void }) {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const [round, setRound] = useState(0);
  const words = useMemo(() => seededShuffle(unit.words.filter((x) => x.word.length >= 2 && x.word.length <= 8), round * 23 + 9).slice(0, 5), [unit, round]);
  const [i, setI] = useState(0);
  const [built, setBuilt] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [miss, setMiss] = useState(false);
  const [state, setState] = useState<'play' | 'right' | 'wrong'>('play');
  const [done, setDone] = useState(false);
  const target = words[i];
  const letters = useMemo(() => {
    const ls = target.word.split('');
    let s = seededShuffle(ls.map((ch, k) => ({ ch, k })), i * 7 + round + 3);
    if (s.map((x) => x.ch).join('') === target.word && ls.length > 1) s = [...s.slice(1), s[0]];
    return s;
  }, [target, i, round]);
  const attempt = built.map((k) => letters[k].ch).join('');

  useEffect(() => {
    if (attempt.length !== target.word.length || state !== 'play') return;
    if (attempt === target.word) {
      setState('right');
      if (!miss) setScore((n) => n + 1);
      say(target.fr);
    } else {
      setState('wrong');
      setMiss(true);
      const t = window.setTimeout(() => { setBuilt([]); setState('play'); }, 900);
      return () => window.clearTimeout(t);
    }
  }, [attempt, target, state, miss]);

  if (done) return <EndCard score={score} total={words.length} onAgain={() => { setRound((r) => r + 1); setI(0); setBuilt([]); setScore(0); setMiss(false); setState('play'); setDone(false); }} onDone={onExit} />;
  return (
    <div className="kg-play">
      <div className="kg-hud"><span>{i + 1}/{words.length}</span><span className="kg-points">{score} ★</span></div>
      <div className="kg-question">
        <span className="kg-big-emoji">{target.emoji}</span>
        <h3>{fr ? `Écris le mot : « ${target.en} »` : `Spell the French word for “${target.en}”`}</h3>
        <button className="kg-listen-btn" onClick={() => say(target.fr)} aria-label={fr ? 'Écouter' : 'Listen'}>🔊</button>
      </div>
      <div className="kg-slots" data-state={state} aria-live="polite">
        {target.word.split('').map((_, k) => <span key={k} className="kg-slot">{attempt[k] ?? ''}</span>)}
      </div>
      <div className="kg-letters">
        {letters.map((x, k) => (
          <button key={k} type="button" className="kg-letter" disabled={built.includes(k) || state !== 'play'} onClick={() => setBuilt((b) => [...b, k])}>{x.ch}</button>
        ))}
      </div>
      <div className="row" style={{ justifyContent: 'center' }}>
        {state === 'play' && built.length > 0 && <button className="btn btn-ghost btn-sm" onClick={() => setBuilt((b) => b.slice(0, -1))}>{fr ? '← Effacer' : '← Undo'}</button>}
        {state === 'right' && (
          <button className="btn btn-brand" autoFocus onClick={() => { if (i + 1 >= words.length) { setDone(true); onFinish(score, words.length); } else { setI(i + 1); setBuilt([]); setMiss(false); setState('play'); } }}>
            <span lang="fr">{target.fr} ✓</span> · {fr ? 'Suivant' : 'Next'}
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- Live game: the player's screen ---------- */

export function LivePlayerView({ view, onAnswer, onLeave }: { view: LiveGameView; onAnswer: (choice: number) => void; onLeave: () => void }) {
  const { l, lang } = useI18n();
  const fr = lang === 'fr';
  const me = view.me;
  const mine = me?.answers[view.index];
  const total = view.limitSec * 1000;
  const [nowMs, setNowMs] = useState(Date.now());
  useEffect(() => {
    if (view.phase !== 'question') return;
    const t = window.setInterval(() => setNowMs(Date.now()), 200);
    return () => window.clearInterval(t);
  }, [view.phase]);
  const left = view.questionStartedAt ? Math.max(0, total - (nowMs - Date.parse(view.questionStartedAt))) : total;
  const myRank = view.ranking.find((r) => r.id === me?.id);

  if (view.phase === 'lobby')
    return (
      <div className="kg-live-wait">
        <div className="kg-pulse" aria-hidden>⏳</div>
        <h3>{fr ? 'Tu es dans la partie !' : 'You’re in!'}</h3>
        <p>{fr ? 'Ton nom de joueur :' : 'Your player name:'} <strong lang="fr">{me?.nickname}</strong></p>
        <p className="tiny">{fr ? `${view.players.length} joueur(s) · on attend le tuteur…` : `${view.players.length} player(s) · waiting for your tutor…`}</p>
      </div>
    );
  if (view.phase === 'podium')
    return (
      <div className="kg-live-wait">
        <div className="kg-end-burst" aria-hidden>🏆</div>
        <h3 lang="fr">{myRank?.rank === 1 ? 'Tu as gagné !' : `Tu es ${myRank?.rank ?? '–'}ᵉ !`}</h3>
        <p>{me?.score ?? 0} pts</p>
        <Podium ranking={view.ranking} />
        <button className="btn btn-brand" onClick={onLeave}>{fr ? 'Terminer' : 'Finish'}</button>
      </div>
    );
  const q = view.question!;
  return (
    <div className="kg-play">
      <div className="kg-hud"><span>{fr ? 'Question' : 'Question'} {view.index + 1}/{view.count}</span><span className="kg-points">{me?.score ?? 0} pts</span></div>
      {view.phase === 'question' && <TimerBar left={left} total={total} />}
      <div className="kg-question">
        {q.emoji && <span className="kg-big-emoji">{q.emoji}</span>}
        <h3 lang="fr">{q.prompt}</h3>
        {q.say && !q.emoji && <button className="kg-listen-btn" onClick={() => say(q.say!)} aria-label={fr ? 'Écouter' : 'Listen'}>🔊</button>}
      </div>
      <AnswerTiles q={{ options: q.options, answer: q.answer }} picked={mine?.choice ?? null} reveal={view.phase === 'reveal'} onPick={onAnswer} disabled={view.phase !== 'question'} />
      {view.phase === 'question' && mine && <p className="kg-sent">{fr ? 'Réponse envoyée ! On attend les autres…' : 'Answer sent! Waiting for the others…'}</p>}
      {view.phase === 'reveal' && (
        <div className="kg-feedback" data-ok={mine?.correct || undefined}>
          <strong lang="fr">{mine?.correct ? `Bravo ! +${mine.points}` : mine ? 'Oups !' : fr ? 'Pas de réponse' : 'No answer'}</strong>
          <span>{l(q.explain)}</span>
          {myRank && <span className="tiny">{fr ? `Tu es ${myRank.rank}ᵉ sur ${view.ranking.length}` : `You’re #${myRank.rank} of ${view.ranking.length}`}</span>}
        </div>
      )}
    </div>
  );
}

export function Podium({ ranking }: { ranking: LiveGameView['ranking'] }) {
  const top = ranking.slice(0, 3);
  const order = [top[1], top[0], top[2]].filter(Boolean);
  return (
    <div className="kg-podium">
      {order.map((r) => (
        <motion.div key={r.id} className="kg-step" data-rank={r.rank} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...spring.bouncy, delay: r.rank === 1 ? 0.5 : r.rank === 2 ? 0.25 : 0 }}>
          <span className="kg-step-medal" aria-hidden>{r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : '🥉'}</span>
          <strong lang="fr">{r.nickname}</strong>
          <span className="tiny">{r.score} pts</span>
          <span className="kg-step-block">{r.rank}</span>
        </motion.div>
      ))}
    </div>
  );
}
