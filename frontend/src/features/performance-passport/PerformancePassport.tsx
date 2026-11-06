import { type Milestone } from '@laporte/shared';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Avatar } from '../../components/3d/Portrait';
import { ProgressRing } from '../../components/3d/Depth';
import { AnimatedBar } from '../../components/animations/Reveal';
import { ease } from '../../components/animations/motion';
import { StatusBadge } from '../../components/ui/Controls';
import { Icon, type IconName } from '../../components/ui/Icon';
import { Drawer, Modal } from '../../components/ui/Overlay';
import { useToast } from '../../components/ui/Toasts';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useI18n } from '../../i18n/I18nProvider';
import { useStore } from '../../state/AppStore';
import { formatDate } from '../../utils/format';
import { JourneyMap } from './JourneyMap';

const KIND_ICON: Record<string, IconName> = { video: 'video', reading: 'book', quiz: 'quiz', speaking: 'mic', assignment: 'edit', live: 'meet' };

export function PerformancePassport({ readOnly }: { readOnly?: boolean }) {
  const { t, l, lang } = useI18n();
  const toast = useToast();
  const isMobile = useIsMobile();
  // The curved map needs room for its cards: use the stacked journey whenever the card itself is
  // narrow (small screens, or when the sidebar is open), not only on phones.
  const mapRef = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const el = mapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => setNarrow(entry.contentRect.width < 640));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const mobile = isMobile || narrow;
  const { milestones, learner, actions } = useStore();
  const [open, setOpen] = useState<Milestone | null>(null);
  const [report, setReport] = useState(false);
  const [celebrate, setCelebrate] = useState<string | null>(null);

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
    <div className="passport-grid">
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

      {/* Journey: a traveller's map of the CEFR levels */}
      <div ref={mapRef} className="card jm-card" style={{ ['--pad' as string]: '0', overflow: 'hidden' }}>
        <JourneyMap milestones={milestones} learner={learner} onOpenMilestone={setOpen} celebrate={celebrate} readOnly={readOnly} tall={mobile} extra={() => <Celebration />} />
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
