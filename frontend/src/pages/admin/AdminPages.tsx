import { accessLevel, ADMIN_METRICS, COURSE_AREAS, COURSES, LEARNERS, MEMBERSHIP_PLANS, nextLevel, nowIso, REPORT_REASONS, TUTORS, type Learner, productName } from '@laporte/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Avatar } from '../../components/3d/Portrait';
import { AnimatedBar, CountUp } from '../../components/animations/Reveal';
import { fadeUp, stagger } from '../../components/animations/motion';
import { AreaChart, BarChart, RankedBars } from '../../components/charts/Charts';
import { DemoTag, EmptyState, Notice, StatusBadge } from '../../components/ui/Controls';
import { Icon } from '../../components/ui/Icon';
import { Drawer } from '../../components/ui/Overlay';
import { useToast } from '../../components/ui/Toasts';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/dictionary';
import { useStore } from '../../state/AppStore';
import { daysFromToday, formatDate, formatGhs, formatNumber, formatTime } from '../../utils/format';
import { downloadCsv } from '../../utils/csv';
import { ReceiptModal } from '../../features/billing/Receipt';
import { PageHead } from '../learner/LearnerPages';

const M = ADMIN_METRICS;

export function AdminPage() {
  const { section = 'overview' } = useParams();
  switch (section) {
    case 'learners': return <LearnersAdmin />;
    case 'instructors': return <InstructorsAdmin />;
    case 'courses': return <CoursesAdmin />;
    case 'bookings': return <BookingsAdmin />;
    case 'payments': return <PaymentsAdmin />;
    case 'support': return <SupportAdmin />;
    case 'reports': return <ReportsAdmin />;
    default: return <Overview />;
  }
}

function Kpi({ label, value, format, delta }: { label: string; value: number; format?: (n: number) => string; delta?: string }) {
  return (
    <motion.div variants={fadeUp} className="card stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value"><CountUp value={value} format={format} /></span>
      {delta && <span className="tiny" style={{ color: 'var(--green)', fontWeight: 700 }}>{delta}</span>}
    </motion.div>
  );
}

function Overview() {
  const { t, l, lang } = useI18n();
  const { bookings, learners, payments } = useStore();
  const upcoming = bookings.filter((b) => b.status === 'confirmed').sort((a, b) => a.start.localeCompare(b.start)).slice(0, 5);
  const lowCredit = learners.filter((x) => x.credits <= 1);
  const inactive = learners.filter((x) => daysFromToday(x.lastActive) <= -5);
  const openTickets = useTickets().tickets.filter((tk) => tk.status !== 'resolved');
  const failed = payments.filter((p) => p.status === 'failed');
  const attention = [
    // Each "Open" lands on the list already filtered to exactly these people or items.
    { id: 'credits', icon: 'card' as const, label: t('admin.lowCredits'), people: lowCredit.map((x) => x.name), to: '/admin/learners?show=low-credits' },
    { id: 'inactive', icon: 'clock' as const, label: t('admin.inactive'), people: inactive.map((x) => x.name), to: '/admin/learners?show=inactive' },
    { id: 'tickets', icon: 'support' as const, label: t('admin.openTickets'), people: openTickets.map((tk) => `${tk.id} · ${tk.subject}`), to: '/admin/support?status=open' },
    { id: 'failed', icon: 'x' as const, label: t('admin.failedPayments'), people: failed.map((p) => `${p.reference} · ${learners.find((x) => x.id === p.learnerId)?.name ?? ''}`), to: '/admin/payments?status=failed' },
  ].filter((a) => a.people.length);
  return (
    <motion.div initial="hidden" animate="show" variants={stagger(0.06)}>
      <PageHead title={t('admin.title')} sub={t('admin.sub')}><DemoTag>{t('demo.data')}</DemoTag></PageHead>
      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <Kpi label={t('admin.activeLearners')} value={M.activeLearners} delta="+5% vs W42" />
        <Kpi label={t('admin.newEnrol')} value={M.newEnrolmentsThisMonth} />
        <Kpi label={t('admin.sessions')} value={M.liveSessionsThisMonth} />
        <Kpi label={t('admin.completion')} value={M.completionRate} format={(n) => `${Math.round(n)}%`} />
      </div>
      <div className="dash-grid">
        <motion.section variants={fadeUp} className="card span-12" aria-labelledby="attn-h">
          <div className="row between" style={{ marginBottom: 4 }}>
            <h2 className="h4" id="attn-h">{t('admin.attention')}</h2>
            <span className="tiny muted">{t('admin.attentionSub')}</span>
          </div>
          {attention.length ? (
            <ul className="plan-list">
              {attention.map((a) => (
                <li key={a.id} className="plan-item" data-tone={a.id === 'failed' || a.id === 'credits' ? 'urgent' : undefined} style={{ gridTemplateColumns: '38px minmax(0, 1fr) auto' }}>
                  <span className="plan-icon"><Icon name={a.icon} size={18} /></span>
                  <span style={{ minWidth: 0 }}>
                    <span className="plan-title">{a.label} <span className="num" style={{ color: 'var(--burgundy)' }}>· {a.people.length}</span></span>
                    <span className="tiny muted">{a.people.slice(0, 4).join(' · ')}{a.people.length > 4 ? ' …' : ''}</span>
                  </span>
                  <Link to={a.to} className="btn btn-secondary btn-sm">{lang === 'fr' ? 'Ouvrir' : 'Open'}</Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="checkCircle" title={lang === 'fr' ? 'Rien à traiter' : 'Nothing needs attention'} />
          )}
        </motion.section>
        <motion.section variants={fadeUp} className="card span-8">
          <h2 className="h4" style={{ marginBottom: 14 }}>{t('admin.weeklyActive')}</h2>
          <AreaChart data={M.weeklyActiveLearners} ariaLabel={t('admin.weeklyActive')} />
        </motion.section>
        <motion.section variants={fadeUp} className="card span-4">
          <h2 className="h4" style={{ marginBottom: 14 }}>{t('admin.byLevel')}</h2>
          <BarChart data={M.levelDistribution} ariaLabel={t('admin.byLevel')} color="var(--navy-500)" />
        </motion.section>
        <motion.section variants={fadeUp} className="card span-6">
          <h2 className="h4" style={{ marginBottom: 14 }}>{t('admin.byArea')}</h2>
          <RankedBars data={M.enrolmentsByArea.map((d) => ({ label: l(COURSE_AREAS.find((a) => a.id === d.id)!.name), value: d.value }))} />
        </motion.section>
        <motion.section variants={fadeUp} className="card span-6">
          <div className="row between" style={{ marginBottom: 6 }}>
            <h2 className="h4">{t('app.bookings')}</h2>
            <span className="tiny muted">Google Meet · {t('demo.simulated')}</span>
          </div>
          {upcoming.map((b) => {
            const lr = LEARNERS.find((x) => x.id === b.learnerId)!;
            const tu = TUTORS.find((x) => x.id === b.tutorId)!;
            return (
              <div key={b.id} className="list-row">
                <div className="avatar-stack"><Avatar spec={lr.portrait} size={28} /><Avatar spec={tu.portrait} size={28} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="small" style={{ fontWeight: 600 }}>{lr.name} · {tu.name}</div>
                  <div className="tiny muted" lang="fr">{b.topic}</div>
                </div>
                <span className="tiny num muted">{formatDate(b.start, lang)} {formatTime(b.start, lang)}</span>
              </div>
            );
          })}
        </motion.section>
        <motion.section variants={fadeUp} className="card span-12">
          <div className="row between" style={{ marginBottom: 14 }}>
            <h2 className="h4">{t('admin.revenueTrend')}</h2>
            <span className="small" style={{ fontWeight: 700 }}>{formatGhs(M.revenueThisMonthGhs, lang)} · Oct</span>
          </div>
          <BarChart data={M.revenueByMonthGhs} ariaLabel={t('admin.revenueTrend')} format={(v) => formatGhs(v, lang)} highlightLast height={180} />
          <p className="tiny muted" style={{ marginTop: 8 }}>{t('demo.pricing')}</p>
        </motion.section>
      </div>
    </motion.div>
  );
}

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useI18n();
  return (
    <label style={{ position: 'relative', display: 'block', width: 'min(320px, 100%)' }}>
      <span className="sr-only">{t('common.search')}</span>
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={t('common.search')} style={{ paddingLeft: 40, minHeight: 40 }} />
      <span style={{ position: 'absolute', left: 14, top: 11, color: 'var(--muted)' }}><Icon name="search" size={17} /></span>
    </label>
  );
}

/** Filters an admin list from the URL (e.g. arriving from "Needs attention"), with a clear way back to everything. */
function FilterBanner({ label, onClear }: { label: string; onClear: () => void }) {
  const { lang } = useI18n();
  return (
    <div className="admin-filter" role="status">
      <Icon name="filter" size={15} />
      <span>{lang === 'fr' ? 'Affichage :' : 'Showing:'} <strong>{label}</strong></span>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onClear}>{lang === 'fr' ? 'Tout afficher' : 'Show all'} <Icon name="x" size={14} /></button>
    </div>
  );
}

type LearnerView = 'low-credits' | 'inactive' | null;

function LearnersAdmin() {
  const { t, l, lang } = useI18n();
  const fr = lang === 'fr';
  const { learners, actions } = useStore();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const view = (params.get('show') as LearnerView) ?? null;
  const [q, setQ] = useState('');
  const [level, setLevel] = useState('all');
  const [selId, setSelId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const sel = learners.find((x) => x.id === selId) ?? null;
  const lowCredit = (x: Learner) => x.credits <= 1;
  const inactive = (x: Learner) => daysFromToday(x.lastActive) <= -5;
  const list = useMemo(
    () => learners.filter((x) => (level === 'all' || x.level === level) && (view !== 'low-credits' || lowCredit(x)) && (view !== 'inactive' || inactive(x)) && `${x.name} ${x.city} ${x.email ?? ''}`.toLowerCase().includes(q.toLowerCase())),
    [learners, q, level, view],
  );
  const viewLabel = view === 'low-credits' ? t('admin.lowCredits') : view === 'inactive' ? t('admin.inactive') : '';
  const credit = (delta: number) => {
    if (!sel) return;
    const why = reason.trim() || (delta > 0 ? (fr ? 'Geste commercial' : 'Goodwill credit') : fr ? 'Correction' : 'Correction');
    actions.admin.adjustCredits(sel.id, delta, why)
      .then(() => { toast(delta > 0 ? (fr ? `${delta} crédit(s) ajouté(s) pour ${sel.firstName}` : `${delta} credit(s) added for ${sel.firstName}`) : fr ? 'Crédit retiré' : 'Credit removed'); setReason(''); })
      .catch((e) => toast(e instanceof Error ? e.message : String(e)));
  };
  const access = sel ? accessLevel(sel) : 'A1';
  const nextUp = sel ? nextLevel(access) : null;
  const exportCsv = () =>
    downloadCsv(`la-porte-learners-${nowIso().slice(0, 10)}.csv`, [
      ['Name', 'Email', 'City', 'Level', 'Open up to', 'Plan', 'Credits', 'Progress to next level (%)', 'Lessons completed', 'Streak (days)', 'Last active', 'Joined'],
      ...list.map((x) => [x.name, x.email ?? '', x.city, x.level, accessLevel(x), l(MEMBERSHIP_PLANS.find((p) => p.id === x.planId)?.name ?? { en: x.planId, fr: x.planId }), x.credits, x.progressToNext, `${x.lessonsCompleted}/${x.lessonsTotal}`, x.streakDays, x.lastActive, x.joined]),
    ]);
  return (
    <>
      <PageHead title={t('app.learners')} sub={t('admin.showing')}>
        <button className="btn btn-secondary btn-sm" onClick={exportCsv}><Icon name="download" size={15} /> {t('admin.export')} (CSV)</button>
      </PageHead>
      {view && <FilterBanner label={viewLabel} onClear={() => setParams({})} />}
      <div className="row between" style={{ marginBottom: 14 }}>
        <SearchBox value={q} onChange={setQ} />
        <div className="row" style={{ ['--gap' as string]: '6px' }}>
          {['all', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((lv) => (
            <button key={lv} className={`chip ${level === lv ? 'chip-navy' : 'chip-outline'}`} style={{ cursor: 'pointer', minHeight: 32 }} onClick={() => setLevel(lv)} aria-pressed={level === lv}>{lv === 'all' ? t('common.all') : lv}</button>
          ))}
        </div>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>{fr ? 'Apprenant' : 'Learner'}</th><th>{t('courses.level')}</th><th>{fr ? 'Formule' : 'Plan'}</th><th>{t('dash.credits')}</th><th>{fr ? 'Progression' : 'Progress'}</th><th>{fr ? 'Dernière activité' : 'Last active'}</th></tr></thead>
          <tbody>
            {list.map((x) => (
              <tr key={x.id} className="clickable" onClick={() => setSelId(x.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setSelId(x.id)}>
                <td><div className="row" style={{ flexWrap: 'nowrap', ['--gap' as string]: '10px' }}><Avatar spec={x.portrait} size={32} /><div><div style={{ fontWeight: 600 }}>{x.name}</div><div className="tiny muted">{x.city}</div></div></div></td>
                <td><span className="chip chip-burgundy">{x.level}{accessLevel(x) !== x.level ? `–${accessLevel(x)}` : ''}</span></td>
                <td>{l(MEMBERSHIP_PLANS.find((p) => p.id === x.planId)?.name ?? { en: x.planId, fr: x.planId })}</td>
                <td className="num">{x.credits}{lowCredit(x) && <span className="chip chip-burgundy" style={{ marginLeft: 6, minHeight: 20 }}>{fr ? 'bas' : 'low'}</span>}</td>
                <td style={{ minWidth: 120 }}><AnimatedBar value={x.progressToNext} label={x.name} /></td>
                <td className="muted num">{formatDate(x.lastActive, lang, { day: 'numeric', month: 'short' })}{inactive(x) && <span className="chip" style={{ marginLeft: 6, minHeight: 20 }}>{fr ? 'inactif' : 'inactive'}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && <EmptyState title={fr ? 'Aucun résultat' : 'No matching learners'} />}
      </div>
      <Drawer open={!!sel} onClose={() => setSelId(null)} title={sel?.name ?? ''}>
        {sel && (
          <div className="stack" style={{ ['--gap' as string]: '18px' }}>
            <div className="row"><Avatar spec={sel.portrait} size={60} /><div><div className="small muted">{sel.city}{sel.email ? ` · ${sel.email}` : ''}</div><div className="small">{l(sel.goal)}</div></div></div>
            <div className="grid" style={{ ['--gap' as string]: '10px', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              <div className="card card-ivory stat"><span className="stat-label">{t('courses.level')}</span><span className="stat-value">{sel.level}</span></div>
              <div className="card card-ivory stat"><span className="stat-label">{t('dash.lessonsDone')}</span><span className="stat-value">{sel.lessonsCompleted}/{sel.lessonsTotal}</span></div>
              <div className="card card-ivory stat"><span className="stat-label">{t('dash.credits')}</span><span className="stat-value">{sel.credits}</span></div>
              <div className="card card-ivory stat"><span className="stat-label">{t('dash.streak')}</span><span className="stat-value">{sel.streakDays}</span></div>
            </div>
            <section className="stack" style={{ ['--gap' as string]: '8px' }}>
              <h3 className="h4">{fr ? 'Crédits de séance' : 'Session credits'}</h3>
              <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={fr ? 'Motif (ex. séance annulée par la tutrice)' : 'Reason (e.g. session cancelled by the tutor)'} maxLength={200} />
              <div className="row" style={{ ['--gap' as string]: '8px' }}>
                <button className="btn btn-primary btn-sm" onClick={() => credit(1)}><Icon name="plus" size={14} /> 1 {fr ? 'crédit' : 'credit'}</button>
                <button className="btn btn-secondary btn-sm" onClick={() => credit(5)}><Icon name="plus" size={14} /> 5</button>
                <button className="btn btn-ghost btn-sm" disabled={sel.credits === 0} onClick={() => credit(-1)}>− 1</button>
              </div>
            </section>
            <section className="stack" style={{ ['--gap' as string]: '8px' }}>
              <h3 className="h4">{fr ? 'Accès aux niveaux' : 'Level access'}</h3>
              <p className="small muted">{fr ? `Cours ouverts : ${sel.level}${access !== sel.level ? ` à ${access}` : ''}.` : `Courses open: ${sel.level}${access !== sel.level ? ` to ${access}` : ''}.`} {fr ? 'Utile pour un niveau payé par l’employeur ou un geste commercial.' : 'Use for a level paid by an employer, or as a goodwill gesture.'}</p>
              {nextUp ? (
                <button className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => actions.admin.unlockLevel(sel.id, nextUp).then(() => toast(fr ? `Niveau ${nextUp} ouvert pour ${sel.firstName}` : `${nextUp} opened for ${sel.firstName}`)).catch((e) => toast(e instanceof Error ? e.message : String(e)))}>
                  <Icon name="lock" size={14} /> {fr ? `Ouvrir le niveau ${nextUp}` : `Open level ${nextUp}`}
                </button>
              ) : <span className="chip">{fr ? 'Tous les niveaux sont ouverts' : 'All levels are open'}</span>}
            </section>
            <div className="small muted">{fr ? 'Inscrit·e le' : 'Joined'} {formatDate(sel.joined, lang, { day: 'numeric', month: 'long', year: 'numeric' })} · {fr ? 'dernière activité' : 'last active'} {formatDate(sel.lastActive, lang, { day: 'numeric', month: 'short' })}</div>
          </div>
        )}
      </Drawer>
    </>
  );
}

function InstructorsAdmin() {
  const { t, l, lang } = useI18n();
  const fr = lang === 'fr';
  const { bookings } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const tu = TUTORS.find((x) => x.id === openId);
  const upcomingOf = (id: string) => bookings.filter((b) => b.tutorId === id && b.status === 'confirmed' && b.start >= nowIso()).sort((a, b) => a.start.localeCompare(b.start));
  const days = fr ? ['', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] : ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return (
    <>
      <PageHead title={t('app.instructors')} sub={fr ? 'Touchez une personne pour voir ses séances, ses apprenants et ses disponibilités.' : 'Tap someone to see their sessions, learners and availability.'} />
      <div className="grid grid-2">
        {TUTORS.map((x) => {
          const n = upcomingOf(x.id).length;
          return (
            <button key={x.id} type="button" className="card card-interactive row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start', textAlign: 'left', cursor: 'pointer' }} onClick={() => setOpenId(x.id)}>
              <Avatar spec={x.portrait} size={56} />
              <span style={{ flex: 1 }}>
                <span className="row between"><strong>{x.name}</strong><span className="tiny">★ {x.rating}</span></span>
                <span className="small muted" style={{ display: 'block' }}>{l(x.title)}</span>
                <span className="row tiny" style={{ marginTop: 8, ['--gap' as string]: '6px' }}>
                  <span className="chip">{x.levels}</span>
                  <span className="chip chip-gold">{n} {fr ? 'séances à venir' : 'upcoming sessions'}</span>
                  <span className="chip chip-outline">{Object.values(x.availability).flat().length} {fr ? 'créneaux / sem.' : 'slots / week'}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <Drawer open={!!tu} onClose={() => setOpenId(null)} title={tu?.name ?? ''}>
        {tu && (() => {
          const up = upcomingOf(tu.id);
          const learnerIds = [...new Set(bookings.filter((b) => b.tutorId === tu.id).map((b) => b.learnerId))];
          return (
            <div className="stack" style={{ ['--gap' as string]: '18px' }}>
              <div className="row"><Avatar spec={tu.portrait} size={60} /><div><div className="small">{l(tu.title)}</div><div className="tiny muted">{tu.specialities.join(' · ')}</div></div></div>
              <section>
                <h3 className="h4" style={{ marginBottom: 8 }}>{fr ? 'Prochaines séances' : 'Upcoming sessions'} ({up.length})</h3>
                {up.length ? up.slice(0, 6).map((b) => (
                  <div key={b.id} className="list-row">
                    <span className="small num" style={{ minWidth: 110 }}>{formatDate(b.start, lang)} {formatTime(b.start, lang)}</span>
                    <span className="small" style={{ flex: 1 }}>{LEARNERS.find((x) => x.id === b.learnerId)?.name} · <span lang="fr">{b.topic}</span></span>
                  </div>
                )) : <p className="small muted">{fr ? 'Aucune séance prévue.' : 'No sessions booked.'}</p>}
              </section>
              <section>
                <h3 className="h4" style={{ marginBottom: 8 }}>{t('app.learners')} ({learnerIds.length})</h3>
                <div className="row" style={{ ['--gap' as string]: '6px' }}>{learnerIds.map((id) => <span key={id} className="chip chip-outline">{LEARNERS.find((x) => x.id === id)?.name}</span>)}</div>
              </section>
              <section>
                <h3 className="h4" style={{ marginBottom: 8 }}>{fr ? 'Disponibilités hebdomadaires' : 'Weekly availability'}</h3>
                {Object.entries(tu.availability).filter(([, h]) => h.length).map(([d, h]) => (
                  <div key={d} className="list-row"><strong className="small" style={{ minWidth: 44 }}>{days[Number(d)]}</strong><span className="small num">{h.join(' · ')}</span></div>
                ))}
              </section>
            </div>
          );
        })()}
      </Drawer>
    </>
  );
}

function CoursesAdmin() {
  const { t, l } = useI18n();
  const { content } = useStore();
  return (
    <>
      <PageHead title={t('app.courses')}>
        <Link to="/admin/content" className="btn btn-primary btn-sm"><Icon name="layers" size={15} /> {t('app.library')}</Link>
      </PageHead>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>{t('nav.courses')}</th><th>{t('courses.level')}</th><th>{t('courses.duration')}</th><th>{t('courses.lessons')}</th><th>{t('courses.tutor')}</th><th>{t('courses.premium')}</th><th>{t('common.status')}</th></tr></thead>
          <tbody>
            {COURSES.map((c) => (
              <tr key={c.id}>
                <td><div style={{ fontWeight: 600 }}>{l(c.title)}</div><div className="tiny muted">{l(COURSE_AREAS.find((a) => a.id === c.area)!.name)}</div></td>
                <td>{c.levels}</td>
                <td className="num">{c.durationWeeks} {t('courses.weeks')}</td>
                <td className="num">{content.lessons.filter((x) => x.courseId === c.id && x.status === 'published').length}/{content.lessons.filter((x) => x.courseId === c.id && x.status !== 'archived').length}</td>
                <td>{TUTORS.find((tu) => tu.id === c.tutorId)!.name}</td>
                <td>{c.premium ? <Icon name="lock" size={15} /> : '—'}</td>
                <td>{content.lessons.some((x) => x.courseId === c.id && x.status === 'published') ? <StatusBadge status="completed">{t('admin.live')}</StatusBadge> : <StatusBadge status="upcoming">{t('admin.inDevelopment')}</StatusBadge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function BookingsAdmin() {
  const { t, lang } = useI18n();
  const fr = lang === 'fr';
  const { bookings, actions } = useStore();
  const toast = useToast();
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const list = bookings.filter((b) => filter === 'all' || b.status === filter).sort((a, b) => b.start.localeCompare(a.start));
  const pending = bookings.filter((b) => b.cancellation?.review === 'pending');
  const decide = (id: string, decision: 'approved' | 'declined') =>
    actions.reviewCancellation(id, decision, notes[id]?.trim() || (decision === 'approved' ? 'Emergency accepted' : 'Policy applied'))
      .then(() => toast(decision === 'approved' ? (fr ? 'Crédit restitué' : 'Credit restored') : fr ? 'Demande refusée' : 'Request declined'))
      .catch((e) => toast(e instanceof Error ? e.message : String(e)));
  return (
    <>
      <PageHead title={t('app.bookings')} />
      {pending.length > 0 && (
        <section className="card" style={{ marginBottom: 18 }}>
          <h2 className="h4" style={{ marginBottom: 4 }}>{fr ? 'Urgences à examiner' : 'Emergency requests to review'}</h2>
          <p className="tiny muted" style={{ marginBottom: 10 }}>{fr ? 'Annulations à moins de 24 h signalées comme urgentes. Chaque décision est enregistrée.' : 'Cancellations inside 24 hours reported as emergencies. Every decision is recorded.'}</p>
          {pending.map((b) => (
            <div key={b.id} className="list-row" style={{ flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                <strong>{LEARNERS.find((x) => x.id === b.learnerId)?.name}</strong> · <span lang="fr" className="small">{b.topic}</span>
                <div className="tiny muted">{formatDate(b.start, lang)} {formatTime(b.start, lang)} · “{b.cancellation?.reason}”</div>
              </div>
              <input className="input" style={{ flex: '1 1 200px' }} placeholder={fr ? 'Note de décision' : 'Decision note'} value={notes[b.id] ?? ''} onChange={(e) => setNotes((n) => ({ ...n, [b.id]: e.target.value }))} />
              <button className="btn btn-brand btn-sm" onClick={() => void decide(b.id, 'approved')}><span>{fr ? 'Restituer le crédit' : 'Restore credit'}</span></button>
              <button className="btn btn-ghost btn-sm" onClick={() => void decide(b.id, 'declined')}>{fr ? 'Refuser' : 'Decline'}</button>
            </div>
          ))}
        </section>
      )}
      <div className="row" style={{ marginBottom: 14, ['--gap' as string]: '6px' }}>
        {(['all', 'confirmed', 'completed', 'cancelled'] as const).map((f) => (
          <button key={f} className={`chip ${filter === f ? 'chip-navy' : 'chip-outline'}`} style={{ cursor: 'pointer', minHeight: 32, textTransform: 'capitalize' }} onClick={() => setFilter(f)} aria-pressed={filter === f}>{f === 'all' ? t('common.all') : f}</button>
        ))}
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>ID</th><th>{t('billing.date')}</th><th>{lang === 'fr' ? 'Apprenant' : 'Learner'}</th><th>{t('courses.tutor')}</th><th>{lang === 'fr' ? 'Sujet' : 'Topic'}</th><th>Google Meet</th><th>{t('common.status')}</th></tr></thead>
          <tbody>
            <AnimatePresence initial={false}>
              {list.map((b) => (
                <motion.tr key={b.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <td className="tiny num">{b.id}</td>
                  <td className="num">{formatDate(b.start, lang)} {formatTime(b.start, lang)}</td>
                  <td>{LEARNERS.find((x) => x.id === b.learnerId)?.name}</td>
                  <td>{TUTORS.find((x) => x.id === b.tutorId)?.name}</td>
                  <td lang="fr" className="small">{b.topic}</td>
                  <td><span className="demo-tag">{t('demo.simulated')}</span></td>
                  <td><StatusBadge status={b.status}>{b.status}</StatusBadge></td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </>
  );
}

function PaymentsAdmin() {
  const { t, l, lang } = useI18n();
  const fr = lang === 'fr';
  const { payments, learners } = useStore();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? 'all';
  const [receiptOf, setReceiptOf] = useState<(typeof payments)[number] | null>(null);
  const all = [...payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const list = all.filter((p) => status === 'all' || p.status === status);
  const total = all.filter((p) => p.status === 'success').reduce((n, p) => n + p.amountGhs, 0);
  const statuses = ['all', ...new Set(all.map((p) => p.status))];
  const exportCsv = () =>
    downloadCsv(`la-porte-payments-${nowIso().slice(0, 10)}.csv`, [
      ['Reference', 'Date', 'Learner', 'Product', 'Method', 'Provider', 'Amount (GHS)', 'Status'],
      ...list.map((p) => [p.reference, p.createdAt.slice(0, 10), LEARNERS.find((x) => x.id === p.learnerId)?.name ?? p.learnerId, l(productName(p.planId)), p.method, p.provider, p.amountGhs, p.status]),
    ]);
  return (
    <>
      <PageHead title={t('app.payments')}>
        <button className="btn btn-secondary btn-sm" onClick={exportCsv}><Icon name="download" size={15} /> {t('admin.export')} (CSV)</button>
      </PageHead>
      <Notice>{t('checkout.noCharge')} {t('demo.pricing')}</Notice>
      <div className="grid grid-3" style={{ margin: '16px 0' }}>
        <div className="card stat"><span className="stat-label">{fr ? 'Encaissé (réussi)' : 'Collected (successful)'}</span><span className="stat-value">{formatGhs(total, lang)}</span></div>
        <div className="card stat"><span className="stat-label">{fr ? 'Transactions' : 'Transactions'}</span><span className="stat-value">{formatNumber(all.length, lang)}</span></div>
        <button type="button" className="card stat card-interactive" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => setParams({ status: 'failed' })}><span className="stat-label">{fr ? 'Échecs' : 'Failed'}</span><span className="stat-value">{all.filter((p) => p.status === 'failed').length}</span></button>
      </div>
      {status !== 'all' && <FilterBanner label={status} onClear={() => setParams({})} />}
      <div className="row" style={{ marginBottom: 12, ['--gap' as string]: '6px' }}>
        {statuses.map((s) => <button key={s} className={`chip ${status === s ? 'chip-navy' : 'chip-outline'}`} style={{ cursor: 'pointer', minHeight: 32, textTransform: 'capitalize' }} aria-pressed={status === s} onClick={() => setParams(s === 'all' ? {} : { status: s })}>{s === 'all' ? t('common.all') : s}</button>)}
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>{t('billing.reference')}</th><th>{t('billing.date')}</th><th>{fr ? 'Apprenant' : 'Learner'}</th><th>{fr ? 'Formule' : 'Plan'}</th><th>{t('billing.method')}</th><th>{t('billing.amount')}</th><th>{t('common.status')}</th><th><span className="sr-only">{fr ? 'Reçu' : 'Receipt'}</span></th></tr></thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td className="tiny num">{p.reference}</td>
                <td className="num">{formatDate(p.createdAt, lang, { day: 'numeric', month: 'short' })}</td>
                <td>{LEARNERS.find((x) => x.id === p.learnerId)?.name}</td>
                <td>{l(productName(p.planId))}</td>
                <td>{p.provider}</td>
                <td className="num" style={{ fontWeight: 600 }}>{formatGhs(p.amountGhs, lang)}</td>
                <td><StatusBadge status={p.status}>{p.status}</StatusBadge></td>
                <td>{p.status === 'success' && <button className="btn btn-ghost btn-sm" onClick={() => setReceiptOf(p)}><Icon name="file" size={14} /> {fr ? 'Reçu' : 'Receipt'}</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && <EmptyState title={fr ? 'Aucune transaction' : 'No transactions'} />}
        <ReceiptModal payment={receiptOf} learner={learners.find((x) => x.id === receiptOf?.learnerId)} onClose={() => setReceiptOf(null)} />
      </div>
    </>
  );
}

/** Messages learners reported: the support team checks each one and records the outcome. */
function ReportedMessages() {
  const { l, lang } = useI18n();
  const fr = lang === 'fr';
  const { content, actions } = useStore();
  const toast = useToast();
  const name = (id: string) => LEARNERS.find((x) => x.id === id)?.name ?? TUTORS.find((x) => x.id === id)?.name ?? 'La Porte Support';
  const open = content.reports.filter((r) => r.status === 'open');
  const done = content.reports.filter((r) => r.status !== 'open').slice(0, 5);
  const resolve = (id: string, outcome: 'actioned' | 'dismissed') =>
    actions.community.resolveReport(id, outcome).then(() => toast(outcome === 'actioned' ? (fr ? 'Signalement traité' : 'Report actioned') : fr ? 'Signalement classé' : 'Report dismissed')).catch((e: unknown) => toast(e instanceof Error ? e.message : String(e)));
  return (
    <section className="card" style={{ marginBottom: 18 }} aria-labelledby="reports-h">
      <div className="row between" style={{ marginBottom: 10 }}>
        <h2 id="reports-h" className="h4">{fr ? 'Messages signalés' : 'Reported messages'}</h2>
        <span className={open.length ? 'chip chip-burgundy' : 'chip'}>{open.length} {fr ? 'à examiner' : 'to review'}</span>
      </div>
      {!open.length && !done.length && <p className="small muted">{fr ? 'Aucun signalement. Les apprenants peuvent signaler un message depuis la messagerie.' : 'No reports. Learners can report any message from Messages.'}</p>}
      <div className="stack" style={{ ['--gap' as string]: '10px' }}>
        {[...open, ...done].map((r) => (
          <div key={r.id} className="report-row" data-done={r.status !== 'open' || undefined}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="tiny muted">{l(REPORT_REASONS[r.reason])} · {fr ? 'de' : 'from'} <strong>{name(r.authorId)}</strong> · {fr ? 'signalé par' : 'reported by'} {name(r.reporterId)} · {formatDate(r.at, lang)}</div>
              <blockquote className="report-quote" lang="fr" style={{ marginTop: 6 }}>{r.excerpt}</blockquote>
              {r.note && <p className="tiny" style={{ marginTop: 4 }}>“{r.note}”</p>}
            </div>
            {r.status === 'open' ? (
              <div className="row" style={{ ['--gap' as string]: '6px', flexWrap: 'nowrap' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => void resolve(r.id, 'dismissed')}>{fr ? 'Classer' : 'Dismiss'}</button>
                <button className="btn btn-brand btn-sm" onClick={() => void resolve(r.id, 'actioned')}>{fr ? 'Traiter' : 'Take action'}</button>
              </div>
            ) : (
              <span className="chip">{r.status === 'actioned' ? (fr ? 'Traité' : 'Actioned') : fr ? 'Classé' : 'Dismissed'}</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Support tickets: status and replies, kept on this device in the demo ---------- */

type TicketStatus = 'open' | 'awaiting policy' | 'resolved';
interface TicketEdit { status?: TicketStatus; replies?: { at: string; text: string }[] }
const TICKETS_KEY = 'laporte-admin-tickets';
const readTicketEdits = (): Record<string, TicketEdit> => { try { return JSON.parse(localStorage.getItem(TICKETS_KEY) ?? '{}'); } catch { return {}; } };

/** The demo tickets with any status changes and replies the support team has made. */
function useTickets() {
  const [edits, setEdits] = useState<Record<string, TicketEdit>>(readTicketEdits);
  // Functional updates, so a reply and a status change made together are both kept.
  const save = (change: (prev: Record<string, TicketEdit>) => Record<string, TicketEdit>) =>
    setEdits((prev) => { const next = change(prev); try { localStorage.setItem(TICKETS_KEY, JSON.stringify(next)); } catch { /* storage blocked */ } return next; });
  const tickets = M.supportTickets.map((tk) => ({ ...tk, status: (edits[tk.id]?.status ?? tk.status) as TicketStatus, replies: edits[tk.id]?.replies ?? [] }));
  return {
    tickets,
    setStatus: (id: string, status: TicketStatus) => save((e) => ({ ...e, [id]: { ...e[id], status } })),
    reply: (id: string, text: string) => save((e) => ({ ...e, [id]: { ...e[id], replies: [...(e[id]?.replies ?? []), { at: new Date().toISOString(), text }] } })),
  };
}

function SupportAdmin() {
  const { t, lang } = useI18n();
  const fr = lang === 'fr';
  const toast = useToast();
  const { tickets, setStatus, reply } = useTickets();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? 'all';
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const list = tickets.filter((tk) => status === 'all' || (status === 'open' ? tk.status !== 'resolved' : tk.status === status));
  const sel = tickets.find((tk) => tk.id === openId);
  const label = (s: TicketStatus) => (fr ? { open: 'Ouvert', 'awaiting policy': 'En attente (politique)', resolved: 'Résolu' } : { open: 'Open', 'awaiting policy': 'Awaiting policy', resolved: 'Resolved' })[s];
  const badge = (s: TicketStatus) => (s === 'awaiting policy' ? 'awaiting' : s);
  return (
    <>
      <PageHead title={t('app.support')} />
      <ReportedMessages />
      <section className="card" aria-labelledby="tickets-h">
        <div className="row between" style={{ marginBottom: 10 }}>
          <h2 id="tickets-h" className="h4">{fr ? 'Demandes d’assistance' : 'Support tickets'}</h2>
          <div className="row" style={{ ['--gap' as string]: '6px' }}>
            {(['all', 'open', 'resolved'] as const).map((s) => <button key={s} className={`chip ${status === s ? 'chip-navy' : 'chip-outline'}`} style={{ cursor: 'pointer', minHeight: 32 }} aria-pressed={status === s} onClick={() => setParams(s === 'all' ? {} : { status: s })}>{s === 'all' ? t('common.all') : s === 'open' ? (fr ? 'À traiter' : 'To handle') : label('resolved')}</button>)}
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>ID</th><th>{fr ? 'Objet' : 'Subject'}</th><th>{fr ? 'De' : 'From'}</th><th>{fr ? 'Ouvert' : 'Opened'}</th><th>{t('common.status')}</th></tr></thead>
            <tbody>
              {list.map((tk) => (
                <tr key={tk.id} className="clickable" tabIndex={0} onClick={() => setOpenId(tk.id)} onKeyDown={(e) => e.key === 'Enter' && setOpenId(tk.id)}>
                  <td className="tiny num">{tk.id}</td>
                  <td style={{ fontWeight: 600 }}>{tk.subject}{tk.replies.length > 0 && <span className="tiny muted"> · {tk.replies.length} {fr ? 'réponse(s)' : 'repl(ies)'}</span>}</td>
                  <td>{tk.from}</td>
                  <td className="num">{formatDate(tk.opened, lang)}</td>
                  <td><StatusBadge status={badge(tk.status) as 'open' | 'awaiting' | 'resolved'}>{label(tk.status)}</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!list.length && <EmptyState icon="checkCircle" title={fr ? 'Rien à traiter' : 'Nothing to handle'} />}
        </div>
      </section>
      <div style={{ marginTop: 14 }}><Notice tone="navy">{t('demo.notifications')}</Notice></div>
      <Drawer open={!!sel} onClose={() => setOpenId(null)} title={sel ? `${sel.id} · ${sel.subject}` : ''}>
        {sel && (
          <div className="stack" style={{ ['--gap' as string]: '16px' }}>
            <div className="small muted">{fr ? 'De' : 'From'} <strong>{sel.from}</strong> · {formatDate(sel.opened, lang, { day: 'numeric', month: 'long' })}</div>
            <label className="field">
              <span className="label">{t('common.status')}</span>
              <select className="select" value={sel.status} onChange={(e) => { setStatus(sel.id, e.target.value as TicketStatus); toast(fr ? 'Statut mis à jour' : 'Status updated'); }}>
                {(['open', 'awaiting policy', 'resolved'] as const).map((s) => <option key={s} value={s}>{label(s)}</option>)}
              </select>
            </label>
            <section>
              <h3 className="h4" style={{ marginBottom: 8 }}>{fr ? 'Réponses' : 'Replies'}</h3>
              {sel.replies.length ? sel.replies.map((r) => (
                <div key={r.at} className="card card-flat" style={{ ['--pad' as string]: '10px 12px', marginBottom: 8 }}><p className="small">{r.text}</p><span className="tiny muted">{formatDate(r.at, lang)} {formatTime(r.at, lang)}</span></div>
              )) : <p className="small muted">{fr ? 'Pas encore de réponse.' : 'No reply yet.'}</p>}
              <form className="stack" style={{ ['--gap' as string]: '8px', marginTop: 8 }} onSubmit={(e) => { e.preventDefault(); if (!draft.trim()) return; reply(sel.id, draft.trim()); setDraft(''); toast(fr ? 'Réponse enregistrée' : 'Reply saved'); }}>
                <textarea className="textarea" style={{ minHeight: 90 }} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={fr ? 'Répondre à la personne…' : 'Reply to the person…'} maxLength={2000} />
                <div className="row" style={{ ['--gap' as string]: '8px' }}>
                  <button className="btn btn-primary btn-sm" disabled={!draft.trim()}>{fr ? 'Enregistrer la réponse' : 'Save reply'}</button>
                  {sel.status !== 'resolved' && <button type="button" className="btn btn-secondary btn-sm" onClick={() => { if (draft.trim()) { reply(sel.id, draft.trim()); setDraft(''); } setStatus(sel.id, 'resolved'); toast(fr ? 'Demande résolue' : 'Ticket resolved'); }}><Icon name="check" size={14} /> {fr ? 'Résoudre' : 'Resolve'}</button>}
                </div>
              </form>
              <p className="tiny muted" style={{ marginTop: 6 }}>{fr ? 'Démo : les réponses restent sur cet appareil ; l’envoi par e-mail sera branché avec le vrai service d’assistance.' : 'Demo: replies stay on this device; sending them by email comes with the real helpdesk.'}</p>
            </section>
          </div>
        )}
      </Drawer>
    </>
  );
}

function ReportsAdmin() {
  const { t, l, lang } = useI18n();
  const cards: { key: MessageKey; value: string }[] = [
    { key: 'admin.activeLearners', value: formatNumber(M.activeLearners, lang) },
    { key: 'admin.completion', value: `${M.completionRate}%` },
    { key: 'admin.sessions', value: formatNumber(M.liveSessionsThisMonth, lang) },
    { key: 'admin.revenue', value: formatGhs(M.revenueThisMonthGhs, lang) },
  ];
  const exportCsv = () =>
    downloadCsv(`la-porte-report-${nowIso().slice(0, 10)}.csv`, [
      ['Metric', 'Value'],
      ['Active learners', M.activeLearners],
      ['New enrolments this month', M.newEnrolmentsThisMonth],
      ['Live sessions this month', M.liveSessionsThisMonth],
      ['Course completion (%)', M.completionRate],
      ['Revenue this month (GHS)', M.revenueThisMonthGhs],
      [],
      ['Enrolments by area', ''],
      ...M.enrolmentsByArea.map((d) => [l(COURSE_AREAS.find((a) => a.id === d.id)!.name), d.value]),
    ]);
  return (
    <>
      <PageHead title={t('app.reports')}>
        <div className="row" style={{ ['--gap' as string]: '8px' }}>
          <DemoTag>{t('demo.data')}</DemoTag>
          <button className="btn btn-secondary btn-sm" onClick={exportCsv}><Icon name="download" size={15} /> {t('admin.export')} (CSV)</button>
        </div>
      </PageHead>
      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        {cards.map((c) => (
          <div key={c.key} className="card stat"><span className="stat-label">{t(c.key)}</span><span className="stat-value">{c.value}</span></div>
        ))}
      </div>
      <div className="dash-grid">
        <div className="card span-6"><h2 className="h4" style={{ marginBottom: 14 }}>{t('admin.byArea')}</h2><RankedBars data={M.enrolmentsByArea.map((d) => ({ label: l(COURSE_AREAS.find((a) => a.id === d.id)!.name), value: d.value }))} /></div>
        <div className="card span-6"><h2 className="h4" style={{ marginBottom: 14 }}>{t('admin.weeklyActive')}</h2><AreaChart data={M.weeklyActiveLearners} ariaLabel={t('admin.weeklyActive')} /></div>
        <div className="card span-6"><h2 className="h4" style={{ marginBottom: 14 }}>{t('admin.byLevel')}</h2><BarChart data={M.levelDistribution} ariaLabel={t('admin.byLevel')} color="var(--navy-500)" /></div>
        <div className="card span-6"><h2 className="h4" style={{ marginBottom: 14 }}>{t('admin.revenueTrend')}</h2><BarChart data={M.revenueByMonthGhs} ariaLabel={t('admin.revenueTrend')} format={(v) => formatGhs(v, lang)} highlightLast height={160} /></div>
      </div>
    </>
  );
}
