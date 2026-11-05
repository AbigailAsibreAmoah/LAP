import { storyFor, type KidUnit } from '@laporte/shared';
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { speakFrench } from '../../utils/speech';
import type { Finish } from './KidGames';

const say = (text: string, done: () => void = () => undefined) => speakFrench(text.replace('…', ''), done, 0.8);
const MARKERS = ['A', 'B', 'C', 'D'];

/** Story time: a short story read aloud line by line, then two questions. */
export function StoryTime({ unit, onFinish }: { unit: KidUnit; onFinish: Finish }) {
  const { l, lang } = useI18n();
  const fr = lang === 'fr';
  const story = storyFor(unit.id);
  const [line, setLine] = useState(-1);
  const [reading, setReading] = useState(false);
  const [stage, setStage] = useState<'story' | 'questions' | 'done'>('story');
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [showEn, setShowEn] = useState(false);
  const stop = useRef(false);
  useEffect(() => () => {
    stop.current = true;
  }, []);
  if (!story) return null;

  const readAll = () => {
    stop.current = false;
    setReading(true);
    const run = (i: number) => {
      if (stop.current || i >= story.lines.length) {
        setReading(false);
        return;
      }
      setLine(i);
      say(story.lines[i].fr, () => window.setTimeout(() => run(i + 1), 500));
    };
    run(0);
  };
  const pause = () => {
    stop.current = true;
    setReading(false);
  };
  const q = story.questions[qi];
  const pick = (c: number) => {
    setPicked(c);
    if (c === q.answer) setScore((n) => n + 1);
    say(q.options[q.answer].label);
  };
  const next = () => {
    if (qi + 1 >= story.questions.length) {
      setStage('done');
      onFinish(score, story.questions.length);
    } else {
      setQi(qi + 1);
      setPicked(null);
    }
  };

  return (
    <section className="kid-card-big kid-story" aria-labelledby={`story-${unit.id}`}>
      <div className="row between" style={{ alignItems: 'center' }}>
        <h2 id={`story-${unit.id}`} className="kid-h2" lang="fr">📚 {story.title}</h2>
        {stage === 'story' && (
          <button className="btn btn-ghost btn-sm" onClick={() => setShowEn((s) => !s)}>
            {showEn ? (fr ? 'Cacher l’anglais' : 'Hide English') : fr ? 'Voir l’anglais' : 'Show English'}
          </button>
        )}
      </div>

      {stage === 'story' && (
        <>
          <ol className="kid-story-lines">
            {story.lines.map((ln, i) => (
              <li key={i} data-on={line === i || undefined}>
                <button type="button" onClick={() => { pause(); setLine(i); say(ln.fr); }}>
                  <span className="kid-story-emoji" aria-hidden>{ln.emoji}</span>
                  <span>
                    <span lang="fr">{ln.fr}</span>
                    {showEn && <span className="tiny muted" style={{ display: 'block' }}>{ln.en}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <div className="row" style={{ ['--gap' as string]: '8px' }}>
            <button className="btn btn-secondary" onClick={() => (reading ? pause() : readAll())}>{reading ? '⏸' : '▶'} {fr ? 'Écouter l’histoire' : 'Listen to the story'}</button>
            <button className="btn btn-brand" onClick={() => { pause(); setStage('questions'); }}>{fr ? 'Les questions →' : 'Questions →'}</button>
          </div>
        </>
      )}

      {stage === 'questions' && q && (
        <div className="kg-play">
          <div className="kg-hud"><span>{qi + 1}/{story.questions.length}</span><span className="kg-points">{score} ★</span></div>
          <div className="kg-question"><h3 lang="fr">{q.prompt}</h3></div>
          <div className="kg-tiles" data-count={q.options.length}>
            {q.options.map((o, i) => (
              <button key={i} type="button" className="kg-tile" data-i={i} data-state={picked === null ? undefined : i === q.answer ? 'right' : i === picked ? 'wrong' : 'dim'} disabled={picked !== null} onClick={() => pick(i)}>
                <span className="kg-marker" aria-hidden>{MARKERS[i]}</span>
                {o.emoji && <span className="kg-tile-emoji" aria-hidden>{o.emoji}</span>}
                <span lang="fr">{o.label}</span>
              </button>
            ))}
          </div>
          {picked !== null && (
            <div className="kg-feedback" data-ok={picked === q.answer || undefined}>
              <strong lang="fr">{picked === q.answer ? 'Bravo !' : 'Presque !'}</strong>
              <span>{l(q.explain)}</span>
              <button className="btn btn-brand" autoFocus onClick={next}>{fr ? 'Suivant' : 'Next'}</button>
            </div>
          )}
        </div>
      )}

      {stage === 'done' && (
        <div className="kg-end">
          <h3 lang="fr">{score === story.questions.length ? 'Tu as tout compris !' : 'Bien écouté !'}</h3>
          <p>{fr ? `${score} sur ${story.questions.length}` : `${score} out of ${story.questions.length}`}</p>
          <button className="btn btn-ghost btn-sm" onClick={() => { setStage('story'); setQi(0); setPicked(null); setScore(0); setLine(-1); }}>{fr ? 'Relire l’histoire' : 'Read it again'}</button>
        </div>
      )}
    </section>
  );
}
