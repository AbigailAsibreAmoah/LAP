import { DAILY_REVIEW_GOAL, dueToday, nextReview, nowIso, REVIEW_GRADES, reviewStreak, scorePronunciation, type PronunciationScore, type ReviewGrade, type VocabEntry } from '@laporte/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { spring } from '../../components/animations/motion';
import { Icon } from '../../components/ui/Icon';
import { useToast } from '../../components/ui/Toasts';
import { useI18n } from '../../i18n/I18nProvider';
import { useStore } from '../../state/AppStore';
import { recogniseFrench, recognitionSupported } from '../../utils/recognition';
import { speakFrench } from '../../utils/speech';

/** Today's review numbers, shared by the dashboard and the vocabulary page. */
export function useReviewToday() {
  const { vocabulary, content, learner } = useStore();
  const today = nowIso().slice(0, 10);
  const deck = dueToday(vocabulary, content, learner.id, today);
  return { ...deck, streak: reviewStreak(content, learner.id, today), goal: DAILY_REVIEW_GOAL };
}

const inDays = (n: number, fr: boolean) => (n === 0 ? (fr ? 'aujourd’hui' : 'today') : n === 1 ? (fr ? 'demain' : 'tomorrow') : fr ? `dans ${n} j` : `in ${n}d`);

/** A short daily session: see the French, recall it, check, then rate how well you knew it. */
export function ReviewSession({ onDone }: { onDone?: () => void }) {
  const { l, lang } = useI18n();
  const fr = lang === 'fr';
  const { actions, content, learner } = useStore();
  const toast = useToast();
  const today = nowIso().slice(0, 10);
  const { deck, reviewedToday, streak, goal } = useReviewToday();
  // The queue is fixed when the session starts; "Again" puts a card back at the end.
  const [queue, setQueue] = useState<VocabEntry[]>(() => deck);
  const [shown, setShown] = useState(false);
  const [done, setDone] = useState(0);
  const [said, setSaid] = useState<PronunciationScore | null>(null);
  const [listening, setListening] = useState(false);
  const card = queue[0];
  const review = card ? content.vocabReviews.find((r) => r.learnerId === learner.id && r.vocabId === card.id) : undefined;
  const hints = useMemo(() => Object.fromEntries(REVIEW_GRADES.map((g) => [g.id, nextReview(review, g.id, today).days])), [review, today]);

  const grade = (g: ReviewGrade) => {
    if (!card) return;
    void actions.reviewWord(card.id, g).catch((e: unknown) => toast(e instanceof Error ? e.message : String(e)));
    setDone((n) => n + 1);
    setShown(false);
    setSaid(null);
    setQueue((q) => (g === 'again' ? [...q.slice(1), q[0]] : q.slice(1)));
  };
  const sayIt = () => {
    if (!card) return;
    setListening(true);
    recogniseFrench({ maxSeconds: 7 })
      .promise.then((h) => setSaid(scorePronunciation(card.fr, h.transcripts, h.confidence)))
      .catch(() => toast(fr ? 'Rien entendu : réessayez.' : 'Nothing heard: try again.'))
      .finally(() => setListening(false));
  };

  const total = reviewedToday + done;
  if (!card)
    return (
      <div className="card review-done">
        <div className="kg-end-burst" aria-hidden>✅</div>
        <h2 className="h3">{fr ? 'Révision du jour terminée' : 'Today’s review is done'}</h2>
        <p className="muted">{fr ? `${total} mots révisés aujourd’hui · série de ${Math.max(streak, total ? 1 : 0)} jour(s)` : `${total} words reviewed today · ${Math.max(streak, total ? 1 : 0)}-day streak`}</p>
        <p className="small">{fr ? 'Les mots reviendront au bon moment : ceux que vous connaissez bien, plus rarement.' : 'Words come back at the right time: the ones you know well, less often.'}</p>
        {onDone && <button className="btn btn-secondary btn-sm" onClick={onDone}>{fr ? 'Voir tout le carnet' : 'See the whole phrasebook'}</button>}
      </div>
    );

  return (
    <div className="review-wrap">
      <div className="review-top">
        <span className="small"><strong>{queue.length}</strong> {fr ? 'à revoir' : 'to go'}</span>
        <span className="review-goal" title={fr ? 'Objectif du jour' : 'Daily goal'}>
          <span className="review-goal-bar"><span style={{ width: `${Math.min(100, (total / goal) * 100)}%` }} /></span>
          <span className="tiny num">{total}/{goal}</span>
        </span>
        <span className="chip chip-gold"><Icon name="flame" size={13} /> {streak} {fr ? 'j' : 'd'}</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={card.id + queue.length} className="card review-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={spring.settle}>
          {!review && <span className="chip review-new">{fr ? 'Nouveau' : 'New'}</span>}
          <div className="review-front" lang="fr">{card.fr}</div>
          <div className="row" style={{ justifyContent: 'center', ['--gap' as string]: '8px' }}>
            <button className="icon-btn" onClick={() => speakFrench(card.fr, () => undefined, 0.9)} aria-label={fr ? 'Écouter' : 'Listen'}><Icon name="headphones" size={16} /></button>
            {recognitionSupported() && <button className={`btn btn-ghost btn-sm${listening ? ' is-recording' : ''}`} onClick={sayIt} disabled={listening}><Icon name="mic" size={14} /> {listening ? (fr ? 'J’écoute…' : 'Listening…') : fr ? 'Le dire' : 'Say it'}</button>}
          </div>
          {said && (
            <p className="small" style={{ textAlign: 'center' }} lang="fr">
              <span className="pron-score" data-band={said.score >= 90 ? 'great' : said.score >= 70 ? 'good' : said.score >= 45 ? 'almost' : 'low'}>{said.score}%</span>{' '}
              {said.words.map((w, i) => <span key={i} className="pron-word" data-ok={w.ok || undefined}>{w.word} </span>)}
              <span className="tiny muted" style={{ display: 'block' }}>{l(said.label)}</span>
            </p>
          )}
          {shown ? (
            <>
              <div className="review-back">
                <strong>{card.en}</strong>
                {card.example && <span className="small muted" lang="fr" style={{ fontStyle: 'italic' }}>{card.example}</span>}
              </div>
              <p className="tiny muted" style={{ textAlign: 'center', margin: 0 }}>{fr ? 'Vous le saviez ?' : 'Did you know it?'}</p>
              <div className="review-grades">
                {REVIEW_GRADES.map((g) => (
                  <button key={g.id} className="review-grade" data-grade={g.id} onClick={() => grade(g.id)}>
                    <strong>{l(g.label)}</strong>
                    <span className="tiny">{inDays(hints[g.id], fr)}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <button className="btn btn-primary" style={{ alignSelf: 'center' }} onClick={() => setShown(true)}>{fr ? 'Voir la traduction' : 'Show the meaning'}</button>
          )}
        </motion.div>
      </AnimatePresence>
      <p className="tiny muted" style={{ textAlign: 'center' }}>{fr ? 'Essayez de vous souvenir du sens avant de retourner la carte.' : 'Try to recall the meaning before you turn the card.'}</p>
    </div>
  );
}
