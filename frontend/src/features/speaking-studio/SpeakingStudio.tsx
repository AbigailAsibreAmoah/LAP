import { assessSpokenResponse, LEARNERS, SPEAKING_SCENARIOS, TUTORS, type SpeakingFeedback, type SpeakingScenario } from '@laporte/shared';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Avatar } from '../../components/3d/Portrait';
import { LearnerScene } from '../../components/3d/Scene';
import { Waveform } from '../../components/3d/Depth';
import { ease, spring } from '../../components/animations/motion';
import { DemoTag } from '../../components/ui/Controls';
import { Icon } from '../../components/ui/Icon';
import { useToast } from '../../components/ui/Toasts';
import { useI18n } from '../../i18n/I18nProvider';
import { api } from '../../services/api';
import { recogniseFrench, RecognitionError } from '../../utils/recognition';
import { useStore } from '../../state/AppStore';

type Phase = 'select' | 'prompt' | 'response' | 'feedback';

const ama = LEARNERS.find((l) => l.id === 'lrn-ama')!;
const sophie = TUTORS[0];

/** Splits text into words, flagging those inside a highlighted expression. */
function tokenize(text: string, highlights: string[]) {
  const marks = new Array(text.length).fill(false);
  for (const h of highlights) {
    const i = text.toLowerCase().indexOf(h.toLowerCase());
    if (i >= 0) marks.fill(true, i, i + h.length);
  }
  const words: { word: string; hl: boolean }[] = [];
  let pos = 0;
  for (const word of text.split(' ')) {
    words.push({ word, hl: marks[pos + Math.floor(word.length / 2)] });
    pos += word.length + 1;
  }
  return words;
}

/** Speaks French with the browser's built-in voice — only ever on a user click. */
function speakFrench(text: string, onEnd: () => void) {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
  if (!synth) {
    window.setTimeout(onEnd, 2600);
    return () => undefined;
  }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'fr-FR';
  u.rate = 0.92;
  const voice = synth.getVoices().find((v) => v.lang.startsWith('fr'));
  if (voice) u.voice = voice;
  u.onend = onEnd;
  u.onerror = onEnd;
  synth.cancel();
  synth.speak(u);
  return () => synth.cancel();
}

export function SpeakingStudio({ embedded, initialId }: { embedded?: boolean; initialId?: string | null }) {
  const { t, l, lang } = useI18n();
  const toast = useToast();
  const { actions, vocabulary } = useStore();
  const reduce = useReducedMotion();
  const linked = SPEAKING_SCENARIOS.find((s) => s.id === initialId);
  const [scenario, setScenario] = useState<SpeakingScenario>(linked ?? SPEAKING_SCENARIOS[0]);
  const [phase, setPhase] = useState<Phase>(embedded || linked ? 'prompt' : 'select');
  const [speaking, setSpeaking] = useState(false);
  const [result, setResult] = useState<{ transcript: string; feedback: SpeakingFeedback } | null>(null);
  const stopSpeech = useRef<() => void>();
  // Answering out loud: transcribed by the browser's French recogniser and scored automatically.
  const [listening, setListening] = useState(false);
  const [mine, setMine] = useState(false);
  const [micMsg, setMicMsg] = useState<string | null>(null);
  const listener = useRef<ReturnType<typeof recogniseFrench> | null>(null);
  useEffect(() => () => listener.current?.abort(), []);

  useEffect(() => () => stopSpeech.current?.(), []);

  const begin = (sc: SpeakingScenario) => {
    stopSpeech.current?.();
    setSpeaking(false);
    setScenario(sc);
    setResult(null);
    setMine(false);
    setMicMsg(null);
    setPhase('prompt');
  };

  const answerAloud = () => {
    if (listening) return listener.current?.stop();
    stopSpeech.current?.();
    setSpeaking(false);
    setMicMsg(null);
    const l2 = recogniseFrench({ long: true, maxSeconds: 60 });
    listener.current = l2;
    setListening(true);
    l2.promise
      .then((h) => {
        const transcript = h.transcripts[0] ?? '';
        setResult({ transcript, feedback: assessSpokenResponse(scenario, transcript, h.seconds, h.confidence) });
        setMine(true);
        setPhase('feedback');
      })
      .catch((e: unknown) => setMicMsg(e instanceof RecognitionError && e.code === 'unsupported' ? (lang === 'fr' ? 'La réponse à voix haute fonctionne dans Chrome ou Edge. Vous pouvez voir un exemple de réponse.' : 'Answering out loud works in Chrome or Edge. You can still see a model answer.') : e instanceof RecognitionError && e.code === 'denied' ? (lang === 'fr' ? 'Autorisez le micro dans votre navigateur.' : 'Allow the microphone in your browser.') : lang === 'fr' ? 'Rien entendu : réessayez.' : 'Nothing heard: try again.'))
      .finally(() => setListening(false));
  };

  const play = (text: string) => {
    if (speaking) {
      stopSpeech.current?.();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    stopSpeech.current = speakFrench(text, () => setSpeaking(false));
  };

  const reveal = async () => {
    stopSpeech.current?.();
    setSpeaking(false);
    setPhase('response');
    try {
      setResult(await api.speakingFeedback(scenario.id));
    } catch {
      setResult({ transcript: scenario.sampleResponse, feedback: scenario.feedback });
    }
  };

  const next = () => {
    actions.completeScenario(scenario.id);
    const i = SPEAKING_SCENARIOS.findIndex((s) => s.id === scenario.id);
    begin(SPEAKING_SCENARIOS[(i + 1) % SPEAKING_SCENARIOS.length]);
  };

  const inBank = (fr: string) => vocabulary.some((v) => v.fr.toLowerCase() === fr.toLowerCase());
  const addPhrase = (fr: string, en: string) => {
    actions.addVocab({ fr, en, example: scenario.sampleResponse, source: 'Speaking Studio' });
    toast(lang === 'fr' ? `« ${fr} » ajouté à votre carnet` : `“${fr}” added to your phrasebook`);
  };

  const tokens = useMemo(() => tokenize(result?.transcript ?? scenario.sampleResponse, scenario.highlights), [result, scenario]);

  return (
    <div className="studio-grid">
      {/* Learner in her practice space */}
      <div className="card" style={{ ['--pad' as string]: '0', overflow: 'hidden', minHeight: embedded ? 380 : 460, position: 'relative' }}>
        <LearnerScene kind="meeting" spec={ama.portrait} accessory="headphones" expression={phase === 'feedback' ? 'joy' : speaking ? 'focus' : 'smile'}>
          <div style={{ position: 'absolute', left: 14, right: 14, bottom: 14 }}>
            <motion.div className="card" style={{ ['--pad' as string]: '12px 14px', background: 'rgba(255,255,255,.95)' }} layout transition={spring.layout}>
              <div className="row between" style={{ flexWrap: 'nowrap' }}>
                <div>
                  <div className="tiny muted" style={{ fontWeight: 700 }}>{t('studio.context')}</div>
                  <div className="small" style={{ fontWeight: 600, color: 'var(--navy)' }}>{l(scenario.context)}</div>
                </div>
                <span className="chip chip-burgundy">{scenario.level}</span>
              </div>
            </motion.div>
          </div>
        </LearnerScene>
      </div>

      {/* Conversation practice panel */}
      <div className="card" style={{ ['--pad' as string]: '24px', minWidth: 0, boxShadow: 'var(--shadow-2)' }}>
        <div className="row between" style={{ marginBottom: 16 }}>
          <div>
            <div className="eyebrow" style={{ fontSize: '0.68rem' }}>{lang === 'fr' ? 'Pratique de conversation' : 'Conversation practice'}</div>
            <h2 className="h3" style={{ marginTop: 6 }}>{phase === 'select' ? t('studio.choose') : l(scenario.title)}</h2>
          </div>
          {phase !== 'select' && (
            <button className="btn btn-ghost btn-sm" onClick={() => setPhase('select')}>
              <Icon name="layers" size={15} /> {lang === 'fr' ? 'Scénarios' : 'Scenarios'}
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {phase === 'select' ? (
            <motion.div key="select" className="grid grid-2" style={{ ['--gap' as string]: '12px' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {SPEAKING_SCENARIOS.map((sc, i) => (
                <motion.button
                  key={sc.id}
                  className="card card-interactive"
                  style={{ ['--pad' as string]: '16px', textAlign: 'left', cursor: 'pointer' }}
                  onClick={() => begin(sc)}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, ...spring.settle }}
                >
                  <div className="row between">
                    <span className="chip chip-burgundy">{sc.level}</span>
                    <Icon name="arrowRight" size={16} />
                  </div>
                  <h3 className="h4" style={{ marginTop: 10 }}>{l(sc.title)}</h3>
                  <p className="small muted" style={{ marginTop: 4 }}>{l(sc.context)}</p>
                </motion.button>
              ))}
            </motion.div>
          ) : (
            <motion.div key={scenario.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 16 }}>
                <div className="stack" style={{ ['--gap' as string]: '14px', minWidth: 0 }}>
                  {/* Tutor prompt with deliberate reveal */}
                  <div className="card card-ivory" style={{ ['--pad' as string]: '16px' }}>
                    <div className="row" style={{ ['--gap' as string]: '8px', marginBottom: 8 }}>
                      <Avatar spec={sophie.portrait} size={28} />
                      <span className="tiny muted" style={{ fontWeight: 700 }}>{t('studio.prompt')}</span>
                    </div>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 500, lineHeight: 1.35, color: 'var(--navy)' }} lang="fr">
                      {scenario.prompt.split(' ').map((w, i) => (
                        <motion.span key={i} style={{ display: 'inline-block', marginRight: '0.28em' }} initial={{ opacity: 0, y: reduce ? 0 : 8, filter: reduce ? 'none' : 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ delay: 0.15 + i * 0.07, duration: 0.5, ease: ease.out }}>
                          {w}
                        </motion.span>
                      ))}
                    </p>
                    <p className="small muted" style={{ marginTop: 6 }}>{scenario.promptTranslation}</p>
                  </div>

                  {/* Waveform + demo playback */}
                  <div className="row" style={{ ['--gap' as string]: '14px', flexWrap: 'nowrap', padding: '6px 4px' }}>
                    <button className="icon-btn" style={{ width: 52, height: 52, background: speaking ? 'var(--burgundy)' : '#fff', color: speaking ? '#fff' : 'var(--burgundy)', flex: 'none' }} onClick={() => play(phase === 'prompt' ? scenario.prompt : (result?.transcript ?? scenario.sampleResponse))} aria-label={t('studio.listen')} aria-pressed={speaking}>
                      <Icon name={speaking ? 'pause' : 'play'} size={18} />
                    </button>
                    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                      <Waveform active={speaking} bars={32} />
                    </div>
                  </div>
                  <p className="tiny muted" style={{ marginTop: -8 }}>
                    {lang === 'fr' ? 'Lecture par la voix française de votre navigateur.' : 'Plays using your browser’s French voice.'} {t('studio.micNote')}
                  </p>

                  {/* Sample response reveal */}
                  {phase === 'prompt' ? (
                    <div className="stack" style={{ ['--gap' as string]: '8px' }}>
                      <div className="row" style={{ ['--gap' as string]: '8px' }}>
                        <button className={`btn btn-primary${listening ? ' is-recording' : ''}`} onClick={answerAloud}>
                          <Icon name="mic" size={16} /> {listening ? (lang === 'fr' ? 'Terminer et évaluer' : 'Stop and score') : lang === 'fr' ? 'Répondre à voix haute' : 'Answer out loud'}
                        </button>
                        <button className="btn btn-secondary" onClick={reveal} disabled={listening}>{t('studio.reveal')}</button>
                      </div>
                      {listening && <span className="tiny" style={{ color: 'var(--burgundy)' }}>{lang === 'fr' ? 'Je vous écoute… parlez en français, puis touchez « Terminer ».' : 'Listening… answer in French, then tap “Stop and score”.'}</span>}
                      {micMsg && <span className="tiny" style={{ color: 'var(--burgundy)' }}>{micMsg}</span>}
                    </div>
                  ) : (
                    <motion.div className="card" style={{ ['--pad' as string]: '16px', borderColor: 'rgba(196,154,90,.4)' }} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={spring.settle}>
                      <div className="row between" style={{ marginBottom: 8 }}>
                        <span className="tiny" style={{ fontWeight: 700, color: 'var(--burgundy)' }}>{mine ? (lang === 'fr' ? 'Votre réponse (transcrite)' : 'Your answer (transcribed)') : t('studio.response')}</span>
                        {!mine && <DemoTag>{t('demo.simulated')}</DemoTag>}
                      </div>
                      <p lang="fr" style={{ lineHeight: 1.7, color: 'var(--ink)' }}>
                        {tokens.map((tok, i) => (
                          <motion.span
                            key={i}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: reduce ? 0 : i * 0.06, duration: 0.3 }}
                            style={tok.hl ? { background: 'linear-gradient(transparent 55%, rgba(196,154,90,.35) 55%)', fontWeight: 600, color: 'var(--navy)' } : undefined}
                          >
                            {tok.word}{' '}
                          </motion.span>
                        ))}
                      </p>
                      {phase === 'response' && (
                        <motion.button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setPhase('feedback')} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduce ? 0 : tokens.length * 0.06 }}>
                          {t('studio.showFeedback')} <Icon name="arrowRight" size={15} />
                        </motion.button>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Useful phrases / feedback */}
                <div className="stack" style={{ ['--gap' as string]: '12px', minWidth: 0 }}>
                  <AnimatePresence mode="wait">
                    {phase !== 'feedback' ? (
                      <motion.div key="phrases" className="card" style={{ ['--pad' as string]: '16px' }} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={spring.settle}>
                        <h3 className="h4" style={{ marginBottom: 10 }}>{t('studio.phrases')}</h3>
                        <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0, ['--gap' as string]: '4px' }}>
                          {scenario.usefulPhrases.map((p, i) => (
                            <motion.li key={p.fr} className="row between" style={{ flexWrap: 'nowrap', padding: '6px 0', borderBottom: '1px solid var(--line)' }} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.08 }}>
                              <span style={{ minWidth: 0 }}>
                                <span className="fr" lang="fr" style={{ display: 'block' }}>{p.fr}</span>
                                <span className="tiny muted">{p.en}</span>
                              </span>
                              <button className="icon-btn" style={{ width: 32, height: 32, flex: 'none' }} onClick={() => addPhrase(p.fr, p.en)} disabled={inBank(p.fr)} aria-label={`${t('studio.addPhrase')}: ${p.fr}`}>
                                <Icon name={inBank(p.fr) ? 'check' : 'plus'} size={15} />
                              </button>
                            </motion.li>
                          ))}
                        </ul>
                      </motion.div>
                    ) : (
                      <motion.div key="feedback" className="card" style={{ ['--pad' as string]: '16px', boxShadow: 'var(--shadow-2)' }} initial={{ opacity: 0, x: 30, rotateY: -8 }} animate={{ opacity: 1, x: 0, rotateY: 0 }} exit={{ opacity: 0 }} transition={spring.settle}>
                        <div className="row between" style={{ marginBottom: 12 }}>
                          <h3 className="h4">{t('studio.feedback')}</h3>
                          {result?.feedback.simulated !== false ? <DemoTag>{t('demo.simulated')}</DemoTag> : <span className="chip chip-gold">{lang === 'fr' ? 'Évaluation automatique' : 'Automatic scoring'}</span>}
                        </div>
                        {result && (
                          <div className="stack" style={{ ['--gap' as string]: '12px' }}>
                            {(
                              [
                                ['studio.pronunciation', result.feedback.pronunciation],
                                ['studio.fluency', result.feedback.fluency],
                                ['studio.vocabulary', result.feedback.vocabulary],
                              ] as const
                            ).map(([k, v], i) => (
                              <div key={k}>
                                <div className="row between small" style={{ marginBottom: 5 }}>
                                  <span style={{ fontWeight: 600 }}>{t(k)}</span>
                                  <span className="num" style={{ fontWeight: 700 }}>{v}/10</span>
                                </div>
                                <div className="bar bar-gold">
                                  <motion.span initial={{ width: 0 }} animate={{ width: `${v * 10}%` }} transition={{ duration: 1, delay: 0.2 + i * 0.15, ease: ease.out }} />
                                </div>
                              </div>
                            ))}
                            <ul style={{ margin: '4px 0 0', paddingLeft: 18 }} className="small">
                              {result.feedback.notes.map((n, i) => (
                                <motion.li key={i} style={{ marginBottom: 6, color: 'var(--ink-2)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 + i * 0.15 }}>
                                  {l(n)}
                                </motion.li>
                              ))}
                            </ul>
                            <p className="tiny muted">{result.feedback.simulated !== false ? t('demo.sampleFeedback') : lang === 'fr' ? 'Évalué d’après la transcription de votre navigateur : vocabulaire utilisé, longueur, débit et clarté. Votre tuteur donne un retour détaillé sur les sons.' : 'Scored from your browser’s transcript: phrases used, length, pace and clarity. Your tutor gives detailed feedback on sounds.'}</p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {phase === 'feedback' && (
                <motion.div className="row" style={{ marginTop: 18, ['--gap' as string]: '10px' }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => begin(scenario)}>
                    <Icon name="replay" size={15} /> {t('studio.retry')}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => addPhrase(scenario.usefulPhrases[0].fr, scenario.usefulPhrases[0].en)} disabled={inBank(scenario.usefulPhrases[0].fr)}>
                    <Icon name={inBank(scenario.usefulPhrases[0].fr) ? 'check' : 'words'} size={15} /> {inBank(scenario.usefulPhrases[0].fr) ? t('studio.added') : t('studio.addPhrase')}
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={next} style={{ marginLeft: 'auto' }}>
                    {t('studio.next')} <Icon name="arrowRight" size={15} />
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
