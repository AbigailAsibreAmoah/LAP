import { ADMIN_METRICS, COURSE_AREAS, COURSES, LEARNERS, MEMBERSHIP_PLANS, REPORT_REASONS, TUTORS, type Learner } from '@laporte/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
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
  const openTickets = M.supportTickets.filter((tk) => tk.status !== 'resolved');
  const failed = payments.filter((p) => p.status === 'failed');
  const attention = [
    { id: 'credits', icon: 'card' as const, label: t('admin.lowCredits'), people: lowCredit.map((x) => x.name), to: '/admin/learners' },
    { id: 'inactive', icon: 'clock' as const, label: t('admin.inactive'), people: inactive.map((x) => x.name), to: '/admin/learners' },
    { id: 'tickets', icon: 'support' as const, label: t('admin.openTickets'), people: openTickets.map((tk) => `${tk.id} · ${tk.subject}`), to: '/admin/support' },
    { id: 'failed', icon: 'x' as const, label: t('admin.failedPayments'), people: failed.map((p) => `${p.reference} · ${learners.find((x) => x.id === p.learnerId)?.name ?? ''}`), to: '/admin/payments' },
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

function LearnersAdmin() {
  const { t, l, lang } = useI18n();
  const { learners } = useStore();
  const [q, setQ] = useState('');
  const [level, setLevel] = useState('all');
  const [sel, setSel] = useState<Learner | null>(null);
  const list = useMemo(() => learners.filter((x) => (level === 'all' || x.level === level) && `${x.name} ${x.city}`.toLowerCase().includes(q.toLowerCase())), [learners, q, level]);
  return (
    <>
      <PageHead title={t('app.learners')} sub={t('admin.showing')} />
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
          <thead><tr><th>{lang === 'fr' ? 'Apprenant' : 'Learner'}</th><th>{t('courses.level')}</th><th>{lang === 'fr' ? 'Formule' : 'Plan'}</th><th>{t('dash.credits')}</th><th>{lang === 'fr' ? 'Progression' : 'Progress'}</th><th>{lang === 'fr' ? 'Dernière activité' : 'Last active'}</th></tr></thead>
          <tbody>
            {list.map((x) => (
              <tr key={x.id} className="clickable" onClick={() => setSel(x)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setSel(x)}>
                <td><div className="row" style={{ flexWrap: 'nowrap', ['--gap' as string]: '10px' }}><Avatar spec={x.portrait} size={32} /><div><div style={{ fontWeight: 600 }}>{x.name}</div><div className="tiny muted">{x.city}</div></div></div></td>
                <td><span className="chip chip-burgundy">{x.level}</span></td>
                <td>{l(MEMBERSHIP_PLANS.find((p) => p.id === x.planId)!.name)}</td>
                <td className="num">{x.credits}</td>
                <td style={{ minWidth: 120 }}><AnimatedBar value={x.progressToNext} label={x.name} /></td>
                <td className="muted num">{formatDate(x.lastActive, lang, { day: 'numeric', month: 'short' })}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && <EmptyState title={lang === 'fr' ? 'Aucun résultat' : 'No matching learners'} />}
      </div>
      <Drawer open={!!sel} onClose={() => setSel(null)} title={sel?.name ?? ''}>
        {sel && (
          <div className="stack" style={{ ['--gap' as string]: '16px' }}>
            <div className="row"><Avatar spec={sel.portrait} size={60} /><div><div className="small muted">{sel.city}</div><div className="small">{l(sel.goal)}</div></div></div>
            <div className="grid grid-2" style={{ ['--gap' as string]: '10px' }}>
              <div className="card card-ivory stat"><span className="stat-label">{t('courses.level')}</span><span className="stat-value">{sel.level}</span></div>
              <div className="card card-ivory stat"><span className="stat-label">{t('dash.lessonsDone')}</span><span className="stat-value">{sel.lessonsCompleted}/{sel.lessonsTotal}</span></div>
              <div className="card card-ivory stat"><span className="stat-label">{t('dash.credits')}</span><span className="stat-value">{sel.credits}</span></div>
              <div className="card card-ivory stat"><span className="stat-label">{t('dash.streak')}</span><span className="stat-value">{sel.streakDays}</span></div>
            </div>
            <div className="small muted">{lang === 'fr' ? 'Inscrit·e le' : 'Joined'} {formatDate(sel.joined, lang, { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </div>
        )}
      </Drawer>
    </>
  );
}

function InstructorsAdmin() {
  const { t, l } = useI18n();
  const { bookings } = useStore();
  return (
    <>
      <PageHead title={t('app.instructors')} />
      <div className="grid grid-2">
        {TUTORS.map((tu) => {
          const n = bookings.filter((b) => b.tutorId === tu.id && b.status === 'confirmed').length;
          return (
            <div key={tu.id} className="card row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
              <Avatar spec={tu.portrait} size={56} />
              <div style={{ flex: 1 }}>
                <div className="row between"><strong>{tu.name}</strong><span className="tiny">★ {tu.rating}</span></div>
                <div className="small muted">{l(tu.title)}</div>
                <div className="row tiny" style={{ marginTop: 8, ['--gap' as string]: '6px' }}>
                  <span className="chip">{tu.levels}</span>
                  <span className="chip chip-gold">{n} {t('app.bookings').toLowerCase()}</span>
                  <span className="chip chip-outline">{Object.values(tu.availability).flat().length} slots / wk</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
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
  const { payments } = useStore();
  const toast = useToast();
  const list = [...payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const total = list.filter((p) => p.status === 'success').reduce((n, p) => n + p.amountGhs, 0);
  return (
    <>
      <PageHead title={t('app.payments')}>
        <button className="btn btn-secondary btn-sm" onClick={() => toast(lang === 'fr' ? 'Export non disponible dans la démo' : 'Export is not available in the demo', 'download')}><Icon name="download" size={15} /> {t('admin.export')}</button>
      </PageHead>
      <Notice>{t('checkout.noCharge')} {t('demo.pricing')}</Notice>
      <div className="grid grid-3" style={{ margin: '16px 0' }}>
        <div className="card stat"><span className="stat-label">{lang === 'fr' ? 'Transactions affichées (réussies)' : 'Listed transactions (successful)'}</span><span className="stat-value">{formatGhs(total, lang)}</span></div>
        <div className="card stat"><span className="stat-label">{lang === 'fr' ? 'Transactions' : 'Transactions'}</span><span className="stat-value">{formatNumber(list.length, lang)}</span></div>
        <div className="card stat"><span className="stat-label">{lang === 'fr' ? 'Échecs' : 'Failed'}</span><span className="stat-value">{list.filter((p) => p.status === 'failed').length}</span></div>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>{t('billing.reference')}</th><th>{t('billing.date')}</th><th>{lang === 'fr' ? 'Apprenant' : 'Learner'}</th><th>{lang === 'fr' ? 'Formule' : 'Plan'}</th><th>{t('billing.method')}</th><th>{t('billing.amount')}</th><th>{t('common.status')}</th></tr></thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td className="tiny num">{p.reference}</td>
                <td className="num">{formatDate(p.createdAt, lang, { day: 'numeric', month: 'short' })}</td>
                <td>{LEARNERS.find((x) => x.id === p.learnerId)?.name}</td>
                <td>{l(MEMBERSHIP_PLANS.find((x) => x.id === p.planId)!.name)}</td>
                <td>{p.provider}</td>
                <td className="num" style={{ fontWeight: 600 }}>{formatGhs(p.amountGhs, lang)}</td>
                <td><StatusBadge status={p.status}>{p.status}</StatusBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
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

function SupportAdmin() {
  const { t, lang } = useI18n();
  return (
    <>
      <PageHead title={t('app.support')} />
      <ReportedMessages />
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>ID</th><th>{lang === 'fr' ? 'Objet' : 'Subject'}</th><th>{lang === 'fr' ? 'De' : 'From'}</th><th>{lang === 'fr' ? 'Ouvert' : 'Opened'}</th><th>{t('common.status')}</th></tr></thead>
          <tbody>
            {M.supportTickets.map((tk) => (
              <tr key={tk.id}>
                <td className="tiny num">{tk.id}</td>
                <td style={{ fontWeight: 600 }}>{tk.subject}</td>
                <td>{tk.from}</td>
                <td className="num">{formatDate(tk.opened, lang)}</td>
                <td><StatusBadge status={tk.status === 'awaiting policy' ? 'awaiting' : (tk.status as 'open' | 'resolved')}>{tk.status}</StatusBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 14 }}><Notice tone="navy">{t('demo.notifications')}</Notice></div>
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
  return (
    <>
      <PageHead title={t('app.reports')}><DemoTag>{t('demo.data')}</DemoTag></PageHead>
      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        {cards.map((c) => (
          <div key={c.key} className="card stat"><span className="stat-label">{t(c.key)}</span><span className="stat-value">{c.value}</span></div>
        ))}
      </div>
      <div className="dash-grid">
        <div className="card span-6"><h2 className="h4" style={{ marginBottom: 14 }}>{t('admin.byArea')}</h2><RankedBars data={M.enrolmentsByArea.map((d) => ({ label: l(COURSE_AREAS.find((a) => a.id === d.id)!.name), value: d.value }))} /></div>
        <div className="card span-6"><h2 className="h4" style={{ marginBottom: 14 }}>{t('admin.weeklyActive')}</h2><AreaChart data={M.weeklyActiveLearners} ariaLabel={t('admin.weeklyActive')} /></div>
      </div>
    </>
  );
}
