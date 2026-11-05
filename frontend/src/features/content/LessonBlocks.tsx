import { ACCENTS, BLOCK_LABEL, COURSES, TUTORS, type Block, type LessonDoc, type MediaAsset, type QuizQuestion, scorePronunciation, type PronunciationScore } from '@laporte/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { spring } from '../../components/animations/motion';
import { Icon, type IconName } from '../../components/ui/Icon';
import { useToast } from '../../components/ui/Toasts';
import { TypedOnlyTextarea } from '../../components/ui/TypedOnly';
import { useI18n } from '../../i18n/I18nProvider';
import { useStore } from '../../state/AppStore';
import { formatClip } from '../../utils/format';
import { recogniseFrench, RecognitionError } from '../../utils/recognition';
import { speakFrench } from '../../utils/speech';

export const BLOCK_ICON: Record<Block['type'], IconName> = {
  video: 'video',
  notes: 'book',
  dialogue: 'message',
  phrases: 'words',
  listening: 'headphones',
  pronunciation: 'mic',
  quiz: 'quiz',
  assignment: 'edit',
  roleplay: 'users',
};

/* ---------- Media ---------- */

export function AccentChip({ asset }: { asset: MediaAsset }) {
  const { l } = useI18n();
  if (!asset.accent) return null;
  return (
    <span className="chip chip-outline" title={asset.speaker}>
      <Icon name="globe" size={13} /> {l(ACCENTS[asset.accent])}
    </span>
  );
}

/** Plays an uploaded file; until the recording exists, a clearly labelled computer voice reads the transcript. */
export function MediaPlayer({ asset, lesson }: { asset: MediaAsset; lesson?: LessonDoc }) {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const [showText, setShowText] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const stop = useRef<() => void>();
  useEffect(() => () => stop.current?.(), []);

  if (asset.kind === 'video') {
    const course = lesson && COURSES.find((c) => c.id === lesson.courseId);
    const tutor = TUTORS.find((t) => t.id === course?.tutorId) ?? TUTORS[0];
    return (
      <div className="media-frame">
        {asset.url ? (
          <video src={asset.url} controls preload="metadata" playsInline aria-label={asset.title} />
        ) : (
          <div className="video-pending">
            <img className="video-pending-poster" src="/images/lesson-tutor-video.jpg" alt="" aria-hidden />
            <div className="video-pending-copy">
              <span className="chip" style={{ background: 'rgba(255,255,255,.92)' }}><Icon name="video" size={13} /> {formatClip(asset.durationSec)}</span>
              <strong>{fr ? 'Vidéo en production' : 'Video in production'}</strong>
              <span className="small">{fr ? `${tutor.name} présentera cette leçon. En attendant, commencez par les activités ci-dessous.` : `${tutor.name} will introduce this lesson. Meanwhile, start with the activities below.`}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  const play = () => {
    if (speaking) {
      stop.current?.();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    stop.current = speakFrench(asset.transcript ?? asset.title, () => setSpeaking(false));
  };

  return (
    <div className="audio-card">
      <div className="row between" style={{ ['--gap' as string]: '10px' }}>
        <div className="row" style={{ ['--gap' as string]: '10px', flexWrap: 'nowrap', minWidth: 0 }}>
          <span className="tone-icon" data-tone="navy"><Icon name="headphones" size={18} /></span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, color: 'var(--navy)' }} lang="fr">{asset.title}</div>
            <div className="tiny muted">{asset.speaker ? `${asset.speaker} · ` : ''}{formatClip(asset.durationSec)}</div>
          </div>
        </div>
        <AccentChip asset={asset} />
      </div>
      {asset.url ? (
        <audio src={asset.url} controls preload="none" style={{ width: '100%', marginTop: 12 }} />
      ) : (
        <div className="row" style={{ marginTop: 12, ['--gap' as string]: '10px' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={play} aria-pressed={speaking}>
            <Icon name={speaking ? 'pause' : 'play'} size={14} /> {speaking ? (fr ? 'Arrêter' : 'Stop') : fr ? 'Écouter' : 'Listen'}
          </button>
          <span className="tiny muted">{fr ? 'Voix de synthèse provisoire : l’enregistrement natif arrive bientôt.' : 'Temporary computer voice: the native-speaker recording is on its way.'}</span>
        </div>
      )}
      {asset.transcript && (
        <>
          <button type="button" className="link tiny" style={{ marginTop: 10 }} onClick={() => setShowText((s) => !s)} aria-expanded={showText}>
            {showText ? (fr ? 'Masquer la transcription' : 'Hide transcript') : fr ? 'Lire la transcription (faible connexion)' : 'Read transcript (low data)'}
          </button>
          <AnimatePresence>{showText && <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="small fr" lang="fr" style={{ overflow: 'hidden', marginTop: 6 }}>{asset.transcript}</motion.p>}</AnimatePresence>
        </>
      )}
    </div>
  );
}

/* ---------- Quiz ---------- */

export function QuizQuestions({ questions, onDone, onRetry }: { questions: QuizQuestion[]; onDone?: (correct: number) => void; onRetry?: () => void }) {
  const { t, l, lang } = useI18n();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const score = questions.filter((q) => checked[q.id] && answers[q.id] === q.answer).length;
  const all = questions.length > 0 && questions.every((q) => checked[q.id]);
  const reported = useRef(false);
  useEffect(() => {
    if (all && !reported.current) {
      reported.current = true;
      onDone?.(score);
    }
  }, [all, score, onDone]);

  return (
    <div className="stack" style={{ ['--gap' as string]: '20px' }}>
      {questions.map((q, qi) => {
        const isChecked = checked[q.id];
        const correct = answers[q.id] === q.answer;
        return (
          <fieldset key={q.id} className="quiz-q">
            <legend lang="fr">{qi + 1}. {q.prompt}</legend>
            <div className="stack" style={{ ['--gap' as string]: '8px' }}>
              {q.options.map((o, oi) => {
                const selected = answers[q.id] === oi;
                // Scored on the spot: the chosen answer is marked right or wrong and the correct one is always revealed.
                const state = isChecked && oi === q.answer ? 'right' : isChecked && selected ? 'wrong' : undefined;
                return (
                  <label key={oi} className="quiz-option" data-state={state} data-dim={isChecked && !state ? true : undefined}>
                    <input
                      type="radio"
                      name={q.id}
                      checked={selected}
                      disabled={isChecked}
                      onChange={() => {
                        setAnswers((a) => ({ ...a, [q.id]: oi }));
                        setChecked((c) => ({ ...c, [q.id]: true }));
                      }}
                    />
                    <span lang="fr" style={{ flex: 1 }}>{o}</span>
                    {state === 'right' && <span className="quiz-mark" data-kind="right"><Icon name="check" size={14} stroke={2.6} /> {selected ? (lang === 'fr' ? 'Votre réponse' : 'Your answer') : lang === 'fr' ? 'Bonne réponse' : 'Correct answer'}</span>}
                    {state === 'wrong' && <span className="quiz-mark" data-kind="wrong"><Icon name="x" size={14} stroke={2.6} /> {lang === 'fr' ? 'Votre réponse' : 'Your answer'}</span>}
                  </label>
                );
              })}
            </div>
            <AnimatePresence>
              {isChecked && (
                <motion.div key="why" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="quiz-explain" data-correct={correct || undefined} role="status">
                  <strong>{correct ? t('lesson.correct') : t('lesson.incorrect')}</strong>
                  {l(q.explanation) ? <span>{l(q.explanation)}</span> : !correct && <span>{lang === 'fr' ? 'La bonne réponse est indiquée en vert.' : 'The correct answer is shown in green.'}</span>}
                </motion.div>
              )}
            </AnimatePresence>
          </fieldset>
        );
      })}
      <AnimatePresence>
        {all && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring.settle} className="quiz-result" role="status">
            <span className="quiz-score num">{score}/{questions.length}</span>
            <strong style={{ flex: 1 }}>{score === questions.length ? (lang === 'fr' ? 'Parfait, tout est juste.' : 'Perfect, all correct.') : lang === 'fr' ? 'Relisez les explications ci-dessus.' : 'Re-read the explanations above.'}</strong>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setAnswers({});
                setChecked({});
                reported.current = false;
                onRetry?.();
              }}
            >
              <Icon name="replay" size={14} /> {lang === 'fr' ? 'Recommencer' : 'Retry'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- Pronunciation: listen, record yourself, compare ---------- */

function PronounceItem({ item, asset }: { item: { fr: string; tip: { en: string; fr: string } }; asset?: MediaAsset }) {
  const { l, lang } = useI18n();
  const fr = lang === 'fr';
  const [state, setState] = useState<'idle' | 'playing' | 'recording'>('idle');
  const [take, setTake] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const [micError, setMicError] = useState(false);
  useEffect(() => () => { if (take) URL.revokeObjectURL(take); }, [take]);
  // Automatic check: the browser's French recogniser transcribes the attempt and each word is scored.
  const [checking, setChecking] = useState(false);
  const [check, setCheck] = useState<PronunciationScore | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const runCheck = () => {
    setCheckError(null);
    setChecking(true);
    recogniseFrench({ maxSeconds: 8 })
      .promise.then((h) => setCheck(scorePronunciation(item.fr.replace(/_/g, ' '), h.transcripts, h.confidence)))
      .catch((e: unknown) => setCheckError(e instanceof RecognitionError && e.code === 'unsupported' ? (fr ? 'La vérification automatique fonctionne dans Chrome ou Edge. Enregistrez-vous et réécoutez.' : 'Automatic checking works in Chrome or Edge. Record yourself and listen back instead.') : e instanceof RecognitionError && e.code === 'denied' ? (fr ? 'Autorisez le micro pour vérifier votre prononciation.' : 'Allow the microphone to check your pronunciation.') : fr ? 'Rien entendu : réessayez un peu plus près du micro.' : 'Nothing heard: try again a little closer to the mic.'))
      .finally(() => setChecking(false));
  };

  const listen = () => {
    if (asset?.url) {
      setState('playing');
      const a = new Audio(asset.url);
      a.onended = () => setState('idle');
      void a.play();
      return;
    }
    setState('playing');
    speakFrench(item.fr.replace(/_/g, ' '), () => setState('idle'), 0.85);
  };

  const record = async () => {
    if (state === 'recording') {
      rec.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const r = new MediaRecorder(stream);
      r.ondataavailable = (e) => chunks.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setTake(URL.createObjectURL(new Blob(chunks, { type: r.mimeType })));
        setState('idle');
      };
      rec.current = r;
      r.start();
      setState('recording');
      window.setTimeout(() => r.state === 'recording' && r.stop(), 8000);
    } catch {
      setMicError(true);
    }
  };

  return (
    <li className="pron-item">
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="pron-text" lang="fr">{item.fr.split('_').map((part, i, arr) => <span key={i}>{part}{i < arr.length - 1 && <span className="liaison" aria-hidden>‿</span>}</span>)}</div>
        <div className="tiny muted">{l(item.tip)}</div>
        {check && (
          <div className="pron-check" aria-live="polite">
            <span className="pron-score" data-band={check.score >= 90 ? 'great' : check.score >= 70 ? 'good' : check.score >= 45 ? 'almost' : 'low'}>{check.score}%</span>
            <span lang="fr">{check.words.map((w, i) => <span key={i} className="pron-word" data-ok={w.ok || undefined}>{w.word} </span>)}</span>
            <span className="tiny muted" style={{ display: 'block' }}>{l(check.label)}{check.heard ? ` · ${fr ? 'compris' : 'heard'} : « ${check.heard} »` : ''}</span>
          </div>
        )}
        {checkError && <div className="tiny" style={{ color: 'var(--burgundy)' }}>{checkError}</div>}
        {micError && <div className="tiny" style={{ color: 'var(--burgundy)' }}>{fr ? 'Micro indisponible : autorisez-le dans votre navigateur.' : 'Microphone unavailable: allow it in your browser.'}</div>}
      </div>
      <div className="row" style={{ ['--gap' as string]: '6px', flexWrap: 'nowrap' }}>
        <button type="button" className="icon-btn" onClick={listen} disabled={state !== 'idle'} aria-label={fr ? 'Écouter le modèle' : 'Hear the model'}><Icon name="headphones" size={16} /></button>
        <button type="button" className={`icon-btn${state === 'recording' ? ' is-recording' : ''}`} onClick={record} aria-label={state === 'recording' ? (fr ? 'Arrêter' : 'Stop recording') : fr ? 'M’enregistrer' : 'Record yourself'} aria-pressed={state === 'recording'}><Icon name="mic" size={16} /></button>
        <button type="button" className={`btn btn-secondary btn-sm${checking ? ' is-recording' : ''}`} onClick={runCheck} disabled={checking || state !== 'idle'} aria-label={fr ? 'Vérifier ma prononciation' : 'Check my pronunciation'}><Icon name="mic" size={14} /> {checking ? (fr ? 'J’écoute…' : 'Listening…') : fr ? 'Vérifier' : 'Check'}</button>
        {take && <button type="button" className="icon-btn" onClick={() => void new Audio(take).play()} aria-label={fr ? 'Réécouter mon essai' : 'Play my attempt'}><Icon name="play" size={14} /></button>}
      </div>
    </li>
  );
}

/* ---------- Blocks ---------- */

export function LessonBlock({ block, lesson, media, onQuiz, onRetry }: { block: Block; lesson: LessonDoc; media: MediaAsset[]; onQuiz?: (blockId: string, correct: number, total: number) => void; onRetry?: () => void }) {
  const { t, l, lang } = useI18n();
  const fr = lang === 'fr';
  const toast = useToast();
  const { learner, vocabulary, submissions, actions } = useStore();
  const [showEn, setShowEn] = useState(false);
  const asset = (id?: string) => media.find((m) => m.id === id);

  switch (block.type) {
    case 'video': {
      const v = asset(block.assetId);
      return v ? (
        <>
          <MediaPlayer asset={v} lesson={lesson} />
          {block.caption && l(block.caption) && <p className="small muted" style={{ marginTop: 10 }}>{l(block.caption)}</p>}
        </>
      ) : null;
    }
    case 'notes':
      return (
        <div className="notes-body">
          {block.heading && <h3 className="h4" lang="fr">{block.heading}</h3>}
          {l(block.body).split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
        </div>
      );
    case 'dialogue':
      return (
        <>
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: -6, marginBottom: 10 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowEn((s) => !s)} aria-pressed={showEn}>{showEn ? t('lesson.hideEnglish') : t('lesson.showEnglish')}</button>
          </div>
          <div className="stack" style={{ ['--gap' as string]: '10px' }}>
            {block.lines.map((d, i) => {
              const me = d.speaker === learner.firstName;
              return (
                <motion.div key={i} className="bubble-wrap" data-me={me || undefined} initial={{ opacity: 0, x: me ? 16 : -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08, ...spring.settle }}>
                  <div className="tiny muted bubble-speaker">{d.speaker}</div>
                  <div className="bubble">
                    <div lang="fr">{d.fr}</div>
                    <AnimatePresence>{showEn && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 0.72 }} exit={{ height: 0, opacity: 0 }} className="small" style={{ overflow: 'hidden', marginTop: 4 }}>{d.en}</motion.div>}</AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      );
    case 'phrases':
      return (
        <ul className="phrase-list">
          {block.phrases.map((p) => {
            const saved = vocabulary.some((v) => v.fr === p.fr);
            return (
              <li key={p.fr}>
                <button type="button" className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => speakFrench(p.fr, () => undefined)} aria-label={`${fr ? 'Écouter' : 'Listen'}: ${p.fr}`}><Icon name="headphones" size={15} /></button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="fr" lang="fr">{p.fr}</div>
                  <div className="tiny muted">{p.en}</div>
                </div>
                <button type="button" className="btn btn-ghost btn-sm" disabled={saved} onClick={() => { void actions.addVocab({ fr: p.fr, en: p.en, example: p.fr, source: lesson.title }); toast(fr ? 'Ajouté à votre carnet' : 'Added to your phrasebook'); }}>
                  <Icon name={saved ? 'check' : 'plus'} size={14} /> {saved ? t('studio.added') : t('vocab.add')}
                </button>
              </li>
            );
          })}
        </ul>
      );
    case 'listening': {
      const a = asset(block.assetId);
      return (
        <div className="stack" style={{ ['--gap' as string]: '16px' }}>
          {l(block.instructions) && <p className="small" style={{ color: 'var(--ink-2)' }}>{l(block.instructions)}</p>}
          {a && <MediaPlayer asset={a} />}
          <QuizQuestions questions={block.questions} onDone={(c) => onQuiz?.(block.id, c, block.questions.length)} onRetry={onRetry} />
        </div>
      );
    }
    case 'pronunciation':
      return (
        <>
          {l(block.focus) && <p className="small" style={{ color: 'var(--ink-2)', marginBottom: 12 }}>{l(block.focus)}</p>}
          <ul className="pron-list">{block.items.map((it, i) => <PronounceItem key={i} item={it} asset={asset(it.assetId)} />)}</ul>
          <p className="tiny muted" style={{ marginTop: 10 }}>{fr ? 'Vos enregistrements restent sur cet appareil ; ils ne sont pas envoyés.' : 'Your recordings stay on this device; they are not uploaded.'}</p>
        </>
      );
    case 'quiz':
      return <QuizQuestions questions={block.questions} onDone={(c) => onQuiz?.(block.id, c, block.questions.length)} onRetry={onRetry} />;
    case 'assignment':
      return <AssignmentBlock prompt={l(block.prompt)} minWords={block.minWords} lessonId={lesson.id} submitted={submissions[lesson.id]} onSubmit={(text) => { actions.submitAssignment(lesson.id, text); toast(t('lesson.submitted')); }} />;
    case 'roleplay':
      return (
        <div className="stack" style={{ ['--gap' as string]: '14px' }}>
          <p style={{ color: 'var(--ink-2)' }}>{l(block.situation)}</p>
          <div className="row" style={{ ['--gap' as string]: '8px' }}>
            <span className="chip chip-burgundy">{fr ? 'Vous' : 'You'} · {l(block.learnerRole)}</span>
            <span className="chip">{fr ? 'Partenaire' : 'Partner'} · {l(block.partnerRole)}</span>
          </div>
          <ol className="prompt-list">{block.prompts.map((p, i) => <li key={i} lang="fr">{p}</li>)}</ol>
          <div className="row">
            <Link to="/app/studio" className="btn btn-secondary btn-sm"><Icon name="mic" size={14} /> {t('app.studio')}</Link>
            <Link to="/app/book" className="link small">{fr ? 'Jouer la scène avec un tuteur' : 'Role-play it with a tutor'} <Icon name="arrowRight" size={13} /></Link>
          </div>
        </div>
      );
  }
}

function AssignmentBlock({ prompt, minWords, lessonId, submitted, onSubmit }: { prompt: string; minWords: number; lessonId: string; submitted?: string; onSubmit: (text: string) => void }) {
  const { t, lang } = useI18n();
  const [draft, setDraft] = useState(submitted ?? '');
  const words = draft.trim() ? draft.trim().split(/\s+/).length : 0;
  const id = `assign-${lessonId}`;
  return (
    <>
      <p style={{ color: 'var(--ink-2)', maxWidth: '62ch', marginBottom: 12 }}>{prompt}</p>
      <label className="sr-only" htmlFor={id}>{t('lesson.assignment')}</label>
      <TypedOnlyTextarea id={id} className="textarea" lang="fr" rows={5} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Je comprends votre point de vue, mais…" />
      <div className="row between" style={{ marginTop: 10 }}>
        <span className="tiny num" style={{ color: words >= minWords ? 'var(--green)' : 'var(--muted)', fontWeight: 600 }}>
          {words}/{minWords} {t('lesson.words')}
        </span>
        <button type="button" className="btn btn-brand btn-sm" disabled={words < minWords || draft === submitted} onClick={() => onSubmit(draft)}>
          <span>{submitted ? (lang === 'fr' ? 'Renvoyer' : 'Resubmit') : t('lesson.submit')}</span>
        </button>
      </div>
      {submitted && <p className="tiny" style={{ marginTop: 8, color: 'var(--green)', fontWeight: 600 }}><Icon name="checkCircle" size={13} /> {t('lesson.submitted')}</p>}
    </>
  );
}

export const blockTitle = (b: Block, l: (x: { en: string; fr: string }) => string) => l(BLOCK_LABEL[b.type]);
