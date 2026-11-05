import { type Milestone } from '@laporte/shared';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import { useRef, useState } from 'react';
import { Avatar } from '../../components/3d/Portrait';
import { ProgressRing, Token } from '../../components/3d/Depth';
import { AnimatedBar } from '../../components/animations/Reveal';
import { ease, spring } from '../../components/animations/motion';
import { StatusBadge } from '../../components/ui/Controls';
import { Icon, type IconName } from '../../components/ui/Icon';
import { Drawer, Modal } from '../../components/ui/Overlay';
import { useToast } from '../../components/ui/Toasts';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useI18n } from '../../i18n/I18nProvider';
import { useStore } from '../../state/AppStore';
import { formatDate } from '../../utils/format';

const VB = { w: 1000, h: 560 };
const KIND_ICON: Record<string, IconName> = { video: 'video', reading: 'book', quiz: 'quiz', speaking: 'mic', assignment: 'edit', live: 'meet' };

export function PerformancePassport({ readOnly }: { readOnly?: boolean }) {
  const { t, l, lang } = useI18n();
  const toast = useToast();
  const mobile = useIsMobile();
  const reduce = useReducedMotion();
  const { milestones, learner, actions } = useStore();
  const [open, setOpen] = useState<Milestone | null>(null);
  const [report, setReport] = useState(false);
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  const done = milestones.filter((m) => m.status === 'completed').length;
  const statusLabel = (m: Milestone) =>
    ({ completed: t('passport.completed'), 'in-progress': t('passport.inProgress'), upcoming: t('passport.upcoming'), locked: t('passport.locked') })[m.status];

  const complete = (m: Milestone) => {
    actions.completeMilestone(m.id);
    setOpen(null);
    setCelebrate(m.id);
    toast(lang === 'fr' ? `Jalon validé : ${l(m.title)}` : `Milestone completed: ${l(m.title)}`, 'award');
    window.setTimeout(() => setCelebrate(null), 2200);
  };

  return (
    <div ref={ref} className="passport-grid">
      {/* Passport cover */}
      <div className="card card-navy" style={{ ['--pad' as string]: '28px', display: 'flex', flexDirection: 'column', gap: 22, overflow: 'hidden' }}>
        <svg aria-hidden viewBox="0 0 200 200" style={{ position: 'absolute', right: -60, bottom: -60, width: 260, opacity: 0.08 }}>
          <path d="M20 200V90a80 80 0 0 1 160 0v110" fill="none" stroke="#E7C78F" strokeWidth="6" />
          <path d="M60 200V100a40 40 0 0 1 80 0v100" fill="none" stroke="#E7C78F" strokeWidth="4" />
        </svg>
        <div>
          <h2 style={{ fontSize: 'clamp(1.6rem, 2.6vw, 2.1rem)', color: '#E7C78F', lineHeight: 1.1 }}>{t('passport.title')}</h2>
          <p style={{ marginTop: 8, color: 'rgba(243,238,230,.8)' }}>{t('passport.sub')}</p>
        </div>
        <div className="row" style={{ ['--gap' as string]: '18px', flexWrap: 'nowrap' }}>
          <ProgressRing value={learner.progressToNext} size={112} label={learner.level} sub="→ B1" dark delay={0.4} />
          <div className="stack" style={{ ['--gap' as string]: '4px' }}>
            <span className="muted small">{t('passport.current')}</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>
              {learner.level} · {learner.progressToNext}%
            </span>
            <span className="muted tiny">
              {done}/{milestones.length} {t('passport.milestonesDone')}
            </span>
          </div>
        </div>
        <AnimatedBar value={learner.progressToNext} tone="gold" onDark delay={0.6} label={t('passport.current')} />
        <button className="btn btn-light" style={{ alignSelf: 'flex-start', marginTop: 'auto' }} onClick={() => setReport(true)}>
          {t('passport.report')} <Icon name="arrowRight" size={16} />
        </button>
        <p className="tiny" style={{ color: 'rgba(243,238,230,.55)' }}>{t('passport.disclaimer')}</p>
      </div>

      {/* Journey */}
      <div className="card" style={{ ['--pad' as string]: mobile ? '20px' : '0', position: 'relative', overflow: 'hidden', background: 'linear-gradient(170deg, #FBF5EC 0%, #F3E7D6 55%, #EBDCC5 100%)', minHeight: mobile ? undefined : 520 }}>
        {mobile ? (
          <VerticalJourney milestones={milestones} onOpen={setOpen} statusLabel={statusLabel} celebrate={celebrate} />
        ) : (
          <CurvedJourney milestones={milestones} onOpen={setOpen} statusLabel={statusLabel} inView={inView} reduce={Boolean(reduce)} celebrate={celebrate} />
        )}
      </div>

      <Drawer open={!!open} onClose={() => setOpen(null)} title={open ? l(open.title) : ''}>
        {open && (
          <div className="stack" style={{ ['--gap' as string]: '22px' }}>
            <div className="row">
              <StatusBadge status={open.status}>{statusLabel(open)}</StatusBadge>
              <span className="chip">CEFR {open.level}</span>
              {open.completedOn && <span className="tiny muted">{formatDate(open.completedOn, lang, { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
            </div>
            <p className="italic" style={{ fontSize: '1.15rem', color: 'var(--navy)' }}>“{l(open.canDo)}”</p>
            {open.status === 'in-progress' && <AnimatedBar value={open.progress} label={statusLabel(open)} />}
            <section>
              <h3 className="h4" style={{ marginBottom: 10 }}>{t('passport.skills')}</h3>
              <div className="row" style={{ ['--gap' as string]: '6px' }}>
                {open.skills.map((s) => (
                  <span key={s.en} className="chip chip-outline">{l(s)}</span>
                ))}
              </div>
            </section>
            <section>
              <h3 className="h4" style={{ marginBottom: 6 }}>{t('passport.exercises')}</h3>
              {open.exercises.map((e) => (
                <div key={e.title} className="list-row">
                  <Icon name={KIND_ICON[e.kind] ?? 'book'} size={18} />
                  <span lang="fr" style={{ flex: 1 }}>{e.title}</span>
                  {e.done ? <Icon name="checkCircle" size={18} className="" /> : <span className="tiny muted">—</span>}
                </div>
              ))}
            </section>
            <section>
              <h3 className="h4" style={{ marginBottom: 6 }}>{t('passport.evidence')}</h3>
              {open.evidence.length ? (
                open.evidence.map((ev, i) => (
                  <div key={i} className="card card-flat" style={{ ['--pad' as string]: '12px 14px', marginBottom: 8 }}>
                    <div className="small" style={{ fontWeight: 600 }}>{l(ev.label)}</div>
                    <div className="tiny muted">
                      {ev.by} · {formatDate(ev.date, lang, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                ))
              ) : (
                <p className="small muted">{t('passport.noEvidence')}</p>
              )}
            </section>
            {!readOnly && open.status === 'in-progress' && (
              <button className="btn btn-primary" onClick={() => complete(open)}>
                <Icon name="award" size={17} /> {t('passport.recordEvidence')}
              </button>
            )}
          </div>
        )}
      </Drawer>

      <Modal open={report} onClose={() => setReport(false)} title={t('passport.summary')} width={720}>
        <div className="stack" style={{ ['--gap' as string]: '18px' }}>
          <div className="row" style={{ ['--gap' as string]: '16px' }}>
            <Avatar spec={learner.portrait} size={52} expression="joy" />
            <div>
              <div style={{ fontWeight: 700, fontSize: 17 }}>{learner.name}</div>
              <div className="small muted">
                {l(learner.goal)} · {learner.city}
              </div>
            </div>
          </div>
          <div className="grid grid-3" style={{ ['--gap' as string]: '12px' }}>
            <div className="card card-ivory stat"><span className="stat-label">{t('passport.current')}</span><span className="stat-value">{learner.level}</span></div>
            <div className="card card-ivory stat"><span className="stat-label">→ B1</span><span className="stat-value">{learner.progressToNext}%</span></div>
            <div className="card card-ivory stat"><span className="stat-label">{t('passport.milestonesDone')}</span><span className="stat-value">{done}/{milestones.length}</span></div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>{lang === 'fr' ? 'Jalon' : 'Milestone'}</th><th>CEFR</th><th>{t('common.status')}</th><th>{t('billing.date')}</th></tr>
              </thead>
              <tbody>
                {milestones.map((m) => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600 }}>{l(m.title)}</td>
                    <td>{m.level}</td>
                    <td><StatusBadge status={m.status}>{statusLabel(m)}</StatusBadge></td>
                    <td className="muted">{m.completedOn ? formatDate(m.completedOn, lang, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="tiny muted">{t('passport.disclaimer')}</p>
        </div>
      </Modal>
    </div>
  );
}

type JourneyProps = {
  milestones: Milestone[];
  onOpen: (m: Milestone) => void;
  statusLabel: (m: Milestone) => string;
  celebrate: string | null;
};

function CurvedJourney({ milestones, onOpen, statusLabel, inView, reduce, celebrate }: JourneyProps & { inView: boolean; reduce: boolean }) {
  const { l } = useI18n();
  const { learner } = useStore();
  const n = milestones.length;
  // Evenly spaced stations on a gently rising band keep cards from colliding.
  const points = milestones.map((_, i) => ({ x: 8 + (i * 80) / Math.max(1, n - 1), y: 68 - (i * 34) / Math.max(1, n - 1) }));
  const doneCount = milestones.filter((m) => m.status === 'completed').length;
  const activeIndex = milestones.findIndex((m) => m.status === 'in-progress');
  const reachedIndex = activeIndex >= 0 ? activeIndex : doneCount - 1;
  const full = smoothPath([{ x: 0, y: points[0].y + 4 }, ...points, { x: 100, y: points[n - 1].y - 6 }]);
  const progress = smoothPath([{ x: 0, y: points[0].y + 4 }, ...points.slice(0, reachedIndex + 1)]);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* distant city & horizon for a sense of destination */}
      <svg aria-hidden viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <g fill="#C9B391" opacity=".35">
          <path d="M780 120h20V70h14v50h16V40l20-24 20 24v80h18V84h24v76H780z" />
          <path d="M700 160h30v-40a15 15 0 0 1 30 0v40h20v20h-80z" />
        </g>
        <ellipse cx="880" cy="60" rx="140" ry="50" fill="#FFF3DA" opacity=".6" />
      </svg>
      <svg viewBox={`0 0 ${VB.w} ${VB.h}`} preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden>
        <path d={full} fill="none" stroke="#B9A07A" strokeWidth="2" strokeDasharray="2 10" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity=".7" />
        <path d={full} fill="none" stroke="rgba(110,22,48,.08)" strokeWidth="22" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <motion.path
          d={progress}
          fill="none"
          stroke="#C49A5A"
          strokeWidth="4"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: reduce ? 1 : 0 }}
          animate={{ pathLength: inView ? 1 : 0 }}
          transition={{ duration: 2.2, ease: ease.inOut, delay: 0.3 }}
        />
      </svg>

      {points.map((pt, i) => {
        const m = milestones[i];
        const above = i % 2 === 0;
        const state = m.status === 'completed' ? 'earned' : m.status === 'in-progress' ? 'active' : 'locked';
        const lit = inView || reduce;
        return (
          <div key={m.id} style={{ position: 'absolute', left: `${pt.x}%`, top: `${pt.y}%`, transform: 'translate(-50%, -50%)', zIndex: 2 }}>
            <motion.button
              onClick={() => onOpen(m)}
              aria-label={`${l(m.title)} — ${statusLabel(m)}`}
              style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', display: 'block', position: 'relative' }}
              initial={{ scale: reduce ? 1 : 0.4, opacity: reduce ? 1 : 0 }}
              animate={lit ? { scale: 1, opacity: 1 } : {}}
              transition={{ ...spring.snappy, delay: reduce ? 0 : 0.5 + (i / n) * 2.2 }}
              whileHover={{ scale: 1.08 }}
            >
              {state === 'active' && !reduce && (
                <motion.span aria-hidden style={{ position: 'absolute', inset: -8, borderRadius: '50%', border: '2px solid var(--burgundy)' }} animate={{ scale: [1, 1.35], opacity: [0.6, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }} />
              )}
              <Token state={state} size={48}>
                <Icon name={m.status === 'completed' ? 'check' : m.status === 'in-progress' ? 'clock' : 'lock'} size={20} stroke={2.2} />
              </Token>
              {celebrate === m.id && <Celebration />}
            </motion.button>

            <motion.button
              onClick={() => onOpen(m)}
              className="card card-interactive"
              tabIndex={-1}
              aria-hidden
              style={{
                position: 'absolute',
                left: '50%',
                [above ? 'bottom' : 'top']: 'calc(100% + 10px)',
                x: pt.x < 16 ? -30 : pt.x > 84 ? 'calc(-100% + 30px)' : '-50%',
                width: 164,
                ['--pad' as string]: '10px 12px',
                textAlign: 'left',
                cursor: 'pointer',
              }}
              initial={{ opacity: 0, y: above ? 10 : -10 }}
              animate={lit ? { opacity: 1, y: 0 } : {}}
              transition={{ ...spring.settle, delay: reduce ? 0 : 0.7 + (i / n) * 2.2 }}
            >
              <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--navy)' }}>{l(m.title)}</div>
              <div className="row" style={{ ['--gap' as string]: '6px', marginTop: 6 }}>
                <StatusBadge status={m.status}>{statusLabel(m)}</StatusBadge>
                <span className="tiny muted">{m.level}</span>
              </div>
            </motion.button>

            {m.status === 'in-progress' && (
              <motion.div style={{ position: 'absolute', left: 30, [above ? 'top' : 'bottom']: 18 }} initial={{ opacity: 0, y: 8 }} animate={lit ? { opacity: 1, y: 0 } : {}} transition={{ delay: reduce ? 0 : 2.6, ...spring.settle }} aria-hidden>
                <Avatar spec={learner.portrait} size={40} expression="smile" />
              </motion.div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function VerticalJourney({ milestones, onOpen, statusLabel, celebrate }: JourneyProps) {
  const { l } = useI18n();
  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0, position: 'relative' }}>
      <span aria-hidden style={{ position: 'absolute', left: 23, top: 20, bottom: 20, width: 2, background: 'linear-gradient(var(--gold) 0 45%, var(--ivory-300) 45%)' }} />
      {milestones.map((m, i) => (
        <motion.li key={m.id} initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} style={{ position: 'relative', padding: '10px 0' }}>
          <button onClick={() => onOpen(m)} className="row" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left', width: '100%', flexWrap: 'nowrap', ['--gap' as string]: '14px' }}>
            <span style={{ position: 'relative' }}>
              <Token state={m.status === 'completed' ? 'earned' : m.status === 'in-progress' ? 'active' : 'locked'} size={48}>
                <Icon name={m.status === 'completed' ? 'check' : m.status === 'in-progress' ? 'clock' : 'lock'} size={20} stroke={2.2} />
              </Token>
              {celebrate === m.id && <Celebration />}
            </span>
            <span className="card" style={{ ['--pad' as string]: '10px 12px', flex: 1 }}>
              <span style={{ display: 'block', fontWeight: 700, color: 'var(--navy)' }}>{l(m.title)}</span>
              <span className="row" style={{ ['--gap' as string]: '6px', marginTop: 4 }}>
                <StatusBadge status={m.status}>{statusLabel(m)}</StatusBadge>
                <span className="tiny muted">{m.level}</span>
              </span>
            </span>
          </button>
        </motion.li>
      ))}
    </ol>
  );
}

/** Restrained celebration: a brief ring of gold motes, skipped for reduced motion. */
function Celebration() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <AnimatePresence>
      <span aria-hidden style={{ position: 'absolute', left: '50%', top: '50%', pointerEvents: 'none' }}>
        {Array.from({ length: 14 }, (_, i) => {
          const a = (i / 14) * Math.PI * 2;
          return (
            <motion.span
              key={i}
              style={{ position: 'absolute', width: i % 3 ? 6 : 9, height: i % 3 ? 6 : 9, borderRadius: i % 2 ? 2 : '50%', background: i % 4 === 0 ? 'var(--burgundy)' : 'var(--gold)' }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }}
              animate={{ x: Math.cos(a) * 56, y: Math.sin(a) * 56, opacity: 0, scale: 1, rotate: 90 }}
              transition={{ duration: 1.3, ease: ease.out }}
            />
          );
        })}
      </span>
    </AnimatePresence>
  );
}

/** Catmull-Rom spline through percentage points, in viewBox units. */
function smoothPath(pts: { x: number; y: number }[]) {
  const P = pts.map((p) => ({ x: (p.x / 100) * VB.w, y: (p.y / 100) * VB.h }));
  let d = `M${P[0].x},${P[0].y}`;
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i - 1] ?? P[i];
    const p1 = P[i];
    const p2 = P[i + 1];
    const p3 = P[i + 2] ?? p2;
    d += ` C${p1.x + (p2.x - p0.x) / 6},${p1.y + (p2.y - p0.y) / 6} ${p2.x - (p3.x - p1.x) / 6},${p2.y - (p3.y - p1.y) / 6} ${p2.x},${p2.y}`;
  }
  return d;
}
