import { LEARNERS, TUTORS, type PortraitSpec } from '@laporte/shared';
import { AnimatePresence, LayoutGroup, motion, useInView } from 'motion/react';
import { useEffect, useRef } from 'react';
import { Avatar, Portrait } from '../../components/3d/Portrait';
import { ProgressRing } from '../../components/3d/Depth';
import { ease, spring } from '../../components/animations/motion';
import { StatusBadge } from '../../components/ui/Controls';
import { Icon, type IconName } from '../../components/ui/Icon';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useTimeline } from '../../hooks/useTimeline';
import { useI18n } from '../../i18n/I18nProvider';

/*
 * Storyboard (≈13s, loops):
 *  0 learner & tutor cards glide in · 1 Ama's card expands into a workspace
 *  2 layout reorganises into a weekly timetable · 3 lesson rows populate
 *  4 statuses move Upcoming → In progress → Completed · 5 tutor feedback slides in
 *  6 progress chart draws · 7 timetable becomes a progress view, then returns to 0
 */
const DURATIONS = [1700, 1500, 1200, 1500, 2000, 1500, 1800, 2800];

const ama = LEARNERS.find((l) => l.id === 'lrn-ama')!;
const [sophie, jeanmarc, aicha, thomas] = TUTORS;

const STEP_LABELS = {
  en: ['Learners & tutors', 'Workspace', 'Timetable', 'Lessons', 'Status', 'Feedback', 'Progress chart', 'Progress view'],
  fr: ['Apprenants et tuteurs', 'Espace', 'Emploi du temps', 'Leçons', 'Statuts', 'Retour', 'Graphique', 'Progression'],
};

const CAPTIONS = {
  en: [
    'Learners and tutors, connected in one academy.',
    'Ama’s card opens into her personal workspace.',
    'Her week is organised into a clear timetable.',
    'Lessons, practice and live classes populate her week.',
    'Statuses update as she learns: upcoming, in progress, completed.',
    'Sophie’s feedback arrives right beside the work.',
    'Progress is charted as it happens.',
    'The same lessons become evidence of skills — and a clear next step.',
  ],
  fr: [
    'Apprenants et tuteurs, réunis dans une même académie.',
    'La carte d’Ama s’ouvre sur son espace personnel.',
    'Sa semaine s’organise en un emploi du temps clair.',
    'Leçons, pratique et classes en direct remplissent sa semaine.',
    'Les statuts évoluent : à venir, en cours, terminé.',
    'Le retour de Sophie arrive juste à côté du travail.',
    'La progression se dessine en temps réel.',
    'Les mêmes leçons deviennent des compétences — et une prochaine étape claire.',
  ],
};

interface Row {
  id: string;
  day: string;
  title: string;
  meta: string;
  tutor: PortraitSpec;
  skill: { en: string; fr: string };
  icon: IconName;
}

const ROWS: Row[] = [
  { id: 'r1', day: 'Lun', title: 'French Essentials', meta: 'A2 · Leçon 5', tutor: sophie.portrait, skill: { en: 'Introductions', fr: 'Se présenter' }, icon: 'book' },
  { id: 'r2', day: 'Mar', title: 'Speaking Practice', meta: '30 min', tutor: aicha.portrait, skill: { en: 'Pronunciation', fr: 'Prononciation' }, icon: 'mic' },
  { id: 'r3', day: 'Mer', title: 'Grammar Focus', meta: 'A2 · Leçon 6', tutor: thomas.portrait, skill: { en: 'Past tense', fr: 'Le passé composé' }, icon: 'edit' },
  { id: 'r4', day: 'Jeu', title: 'Live Class', meta: '45 min · Google Meet', tutor: jeanmarc.portrait, skill: { en: 'Meetings', fr: 'Les réunions' }, icon: 'video' },
];

// Status of each row per step (rows appear at step 3).
function statusFor(row: number, step: number): 'upcoming' | 'in-progress' | 'completed' {
  if (step < 4) return 'upcoming';
  if (row === 0) return 'completed';
  if (row === 1) return step >= 5 ? 'completed' : 'in-progress';
  if (row === 2) return step >= 5 ? 'in-progress' : 'upcoming';
  return 'upcoming';
}

const WEEK = [35, 50, 20, 45, 30, 60, 15];

export function WorkspaceShowcase() {
  const { t, lang } = useI18n();
  const mobile = useIsMobile();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: '-120px' });
  const tl = useTimeline({ durations: DURATIONS, loop: true, autoplay: false, restingStep: 6 });
  const s = tl.step;

  // Start when scrolled into view; pause when it leaves.
  useEffect(() => {
    if (tl.reduce) return;
    if (inView) tl.play();
    else tl.pause();
  }, [inView]); // eslint-disable-line react-hooks/exhaustive-deps

  const statusLabel = (st: 'upcoming' | 'in-progress' | 'completed') =>
    ({ upcoming: lang === 'fr' ? 'À venir' : 'Upcoming', 'in-progress': lang === 'fr' ? 'En cours' : 'In progress', completed: lang === 'fr' ? 'Terminé' : 'Completed' })[st];

  return (
    <div ref={ref} className="stack" style={{ ['--gap' as string]: '18px' }}>
      <div
        className="card"
        style={{ ['--pad' as string]: '0', overflow: 'hidden', boxShadow: 'var(--shadow-3)', borderRadius: 26, background: 'linear-gradient(180deg, #FFFFFF 0%, #FBF7F1 100%)' }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '64px 1fr', minHeight: mobile ? 520 : 470 }}>
          {!mobile && <MiniSidebar active={s >= 7 ? 2 : s >= 2 ? 1 : 0} />}
          <div style={{ position: 'relative', padding: mobile ? 16 : 24 }}>
            <LayoutGroup>
              {s === 0 ? (
                <PeopleRow mobile={mobile} />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: mobile || s < 5 ? '1fr' : '1.55fr 1fr', gap: 18, alignItems: 'start' }}>
                  <motion.div layout transition={spring.layout} className="stack" style={{ ['--gap' as string]: '14px', minWidth: 0 }}>
                    <motion.div layoutId="ws-ama" transition={spring.layout} className="row" style={{ ['--gap' as string]: '12px' }}>
                      <Avatar spec={ama.portrait} size={44} expression={s >= 5 ? 'joy' : 'smile'} />
                      <div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 600, color: 'var(--navy)' }}>{lang === 'fr' ? 'Mon apprentissage' : 'My Learning'}</div>
                        <div className="tiny muted">Ama Owusu · A2</div>
                      </div>
                    </motion.div>

                    {s >= 2 && (
                      <motion.div className="tabs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} role="presentation" style={{ overflow: 'hidden' }}>
                        {[lang === 'fr' ? 'Vue d’ensemble' : 'Overview', lang === 'fr' ? 'Calendrier' : 'Calendar', lang === 'fr' ? 'Progression' : 'Progress'].map((label, i) => {
                          const active = s >= 7 ? i === 2 : i === 1;
                          return (
                            <span key={label} style={{ position: 'relative', padding: '8px 12px', fontSize: 13, fontWeight: 600, color: active ? 'var(--navy)' : 'var(--muted)' }}>
                              {label}
                              {active && <motion.span layoutId="ws-tab" className="tab-line" transition={spring.snappy} />}
                            </span>
                          );
                        })}
                      </motion.div>
                    )}

                    {s >= 2 && s < 7 && (
                      <div className="stack" style={{ ['--gap' as string]: '8px' }}>
                        {ROWS.map((row, i) =>
                          s >= 3 ? (
                            <motion.div
                              key={row.id}
                              layoutId={`ws-row-${row.id}`}
                              transition={{ ...spring.layout, delay: s === 3 ? i * 0.12 : 0 }}
                              initial={{ opacity: 0, x: -24 }}
                              animate={{ opacity: 1, x: 0 }}
                              style={{ display: 'grid', gridTemplateColumns: '38px 30px 1fr auto', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 14, background: '#fff', border: '1px solid var(--line)' }}
                            >
                              <span className="tiny" style={{ fontWeight: 700, color: 'var(--muted)' }}>{row.day}</span>
                              <Avatar spec={row.tutor} size={28} />
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--navy)' }}>{row.title}</div>
                                <div className="tiny muted">{row.meta}</div>
                              </div>
                              <AnimatePresence mode="popLayout" initial={false}>
                                <motion.span key={statusFor(i, s)} initial={{ opacity: 0, scale: 0.8, y: 6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: -6 }} transition={spring.snappy}>
                                  <StatusBadge status={statusFor(i, s)}>{statusLabel(statusFor(i, s))}</StatusBadge>
                                </motion.span>
                              </AnimatePresence>
                            </motion.div>
                          ) : (
                            <motion.div key={row.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ height: 52, borderRadius: 14, background: 'repeating-linear-gradient(90deg, var(--ivory) 0 38px, transparent 38px 48px)', border: '1px dashed var(--line-strong)' }} />
                          ),
                        )}
                      </div>
                    )}

                    {s >= 7 && <ProgressView lang={lang} />}
                  </motion.div>

                  <AnimatePresence>
                    {s >= 5 && !mobile && (
                      <motion.div key="side" className="stack" style={{ ['--gap' as string]: '14px' }} initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={spring.settle}>
                        <div className="card" style={{ ['--pad' as string]: '16px', boxShadow: 'var(--shadow-2)' }}>
                          <div className="tiny muted" style={{ fontWeight: 700, marginBottom: 10 }}>{lang === 'fr' ? 'Votre tutrice' : 'Your tutor'}</div>
                          <div className="row" style={{ ['--gap' as string]: '10px', marginBottom: 10 }}>
                            <Avatar spec={sophie.portrait} size={36} expression="joy" />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{sophie.name}</div>
                              <div className="tiny muted">{lang === 'fr' ? 'Conversation et affaires' : 'Conversation & Business'}</div>
                            </div>
                          </div>
                          <p className="small" style={{ color: 'var(--ink-2)' }}>
                            <span className="fr">Bonjour Ama, très belle progression cette semaine !</span> {lang === 'fr' ? 'Votre prononciation s’améliore vraiment.' : 'Your pronunciation is really improving.'}
                          </p>
                        </div>
                        {s >= 6 && (
                          <motion.div className="card" style={{ ['--pad' as string]: '16px' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={spring.settle}>
                            <div className="row between" style={{ marginBottom: 8 }}>
                              <span className="tiny muted" style={{ fontWeight: 700 }}>{lang === 'fr' ? 'Votre progression' : 'Your progress'}</span>
                              <span className="tiny" style={{ fontWeight: 700 }}>A2 · 68%</span>
                            </div>
                            <MiniBars />
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </LayoutGroup>
          </div>
        </div>
      </div>

      {/* Caption + controls — the content stays reachable when paused or with reduced motion */}
      <div className="row between" style={{ ['--gap' as string]: '14px' }}>
        <p className="small" aria-live="polite" style={{ color: 'var(--ink-2)', minHeight: 22, flex: '1 1 260px' }}>
          <strong style={{ color: 'var(--burgundy)' }}>{s + 1}/8</strong> · {CAPTIONS[lang][s]}
        </p>
        <div className="row" style={{ ['--gap' as string]: '6px' }}>
          <button className="icon-btn" onClick={tl.playing ? tl.pause : tl.play} aria-label={tl.playing ? t('common.pause') : t('common.play')}>
            <Icon name={tl.playing ? 'pause' : 'play'} size={16} />
          </button>
          <div className="row" role="group" aria-label={lang === 'fr' ? 'Étapes' : 'Steps'} style={{ ['--gap' as string]: '4px' }}>
            {STEP_LABELS[lang].map((label, i) => (
              <button
                key={label}
                onClick={() => {
                  tl.pause();
                  tl.goTo(i);
                }}
                aria-label={label}
                aria-current={s === i}
                title={label}
                style={{ width: s === i ? 26 : 10, height: 10, borderRadius: 999, border: '12px solid transparent', backgroundClip: 'content-box', boxSizing: 'content-box', margin: '0 -8px', cursor: 'pointer', background: s === i ? 'var(--burgundy)' : 'var(--ivory-300)', transition: 'width .35s cubic-bezier(.22,1,.36,1), background .3s', padding: 0 }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PeopleRow({ mobile }: { mobile: boolean }) {
  const people = [
    { id: 'ws-ama', spec: ama.portrait, name: 'Ama', role: 'A2 · Business' },
    { id: 'p-sophie', spec: sophie.portrait, name: 'Sophie', role: 'Tutor' },
    { id: 'p-jm', spec: jeanmarc.portrait, name: 'Jean-Marc', role: 'Tutor' },
    { id: 'p-aicha', spec: aicha.portrait, name: 'Aïcha', role: 'Tutor' },
    { id: 'p-thomas', spec: thomas.portrait, name: 'Thomas', role: 'Tutor' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: mobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: 14, paddingTop: mobile ? 8 : 70 }}>
      {people.map((p, i) => (
        <motion.div
          key={p.id}
          layoutId={p.id === 'ws-ama' ? 'ws-ama' : undefined}
          className="card"
          initial={{ opacity: 0, x: 80 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...spring.settle, delay: i * 0.09 }}
          style={{ ['--pad' as string]: '0', overflow: 'hidden', boxShadow: i === 0 ? 'var(--shadow-2)' : 'var(--shadow-1)', outline: i === 0 ? '2px solid var(--gold)' : undefined }}
        >
          <div style={{ aspectRatio: '1 / 1', background: 'var(--ivory)' }}>
            <Portrait spec={p.spec} expression={i === 0 ? "joy" : "smile"} />
          </div>
          <div style={{ padding: '10px 12px' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy)' }}>{p.name}</div>
            <div className="tiny muted">{p.role}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function ProgressView({ lang }: { lang: 'en' | 'fr' }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 20, alignItems: 'center' }}>
      <ProgressRing value={68} size={128} label="A2" sub="68% → B1" />
      <div className="stack" style={{ ['--gap' as string]: '10px', minWidth: 0 }}>
        <div className="tiny muted" style={{ fontWeight: 700 }}>{lang === 'fr' ? 'Compétences acquises' : 'Skills completed'}</div>
        <div className="row" style={{ ['--gap' as string]: '6px' }}>
          {ROWS.map((row) => (
            <motion.span key={row.id} layoutId={`ws-row-${row.id}`} transition={spring.layout} className="chip" style={{ background: '#fff', border: '1px solid var(--line)', minHeight: 30 }}>
              <Icon name="checkCircle" size={14} /> {row.skill[lang]}
            </motion.span>
          ))}
        </div>
        <motion.div className="card card-ivory" style={{ ['--pad' as string]: '12px 14px' }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, ...spring.settle }}>
          <div className="tiny" style={{ fontWeight: 700, color: 'var(--burgundy)' }}>{lang === 'fr' ? 'Entraînement recommandé' : 'Recommended practice'}</div>
          <div style={{ fontWeight: 600, fontSize: 13.5 }}>Speaking Studio · {lang === 'fr' ? 'Participer à une réunion' : 'Take part in a meeting'}</div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function MiniBars() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 70 }} aria-hidden>
      {WEEK.map((v, i) => (
        <motion.span
          key={i}
          style={{ flex: 1, borderRadius: 4, background: i === 5 ? 'var(--burgundy)' : 'rgba(110,22,48,.35)' }}
          initial={{ height: 0 }}
          animate={{ height: `${(v / 60) * 100}%` }}
          transition={{ duration: 0.8, delay: i * 0.07, ease: ease.out }}
        />
      ))}
    </div>
  );
}

function MiniSidebar({ active }: { active: number }) {
  const icons: IconName[] = ['home', 'calendar', 'chart', 'mic', 'message'];
  return (
    <div style={{ background: 'var(--navy)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, paddingTop: 20 }} aria-hidden>
      <svg width="22" height="26" viewBox="0 0 34 40" style={{ marginBottom: 14 }}>
        <path d="M3 40V17C3 9 9.3 3 17 3s14 6 14 14v23" fill="none" stroke="#E7C78F" strokeWidth="2.4" />
        <path d="M12.5 40V19.5a4.5 4.5 0 0 1 9 0V40z" fill="#C49A5A" />
      </svg>
      {icons.map((name, i) => (
        <span key={name} style={{ position: 'relative', display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 12, color: i === active ? '#fff' : 'rgba(243,238,230,.5)' }}>
          {i === active && <motion.span layoutId="ws-side" style={{ position: 'absolute', inset: 0, borderRadius: 12, background: 'rgba(196,154,90,.2)' }} transition={spring.snappy} />}
          <Icon name={name} size={18} />
        </span>
      ))}
    </div>
  );
}
