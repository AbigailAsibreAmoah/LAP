import { BOOKING_POLICY, canReschedule, cancellationOutcome, nowIso, DEMO_TODAY, missedSessions, SESSION_PURPOSES, sessionCost, TUTORS, type Booking, type SessionPurpose, type Tutor } from '@laporte/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Avatar } from '../../components/3d/Portrait';
import { PresenceBadge, presenceHint, TutorAvatar } from '../../features/presence/PresenceUI';
import { usePresence } from '../../features/presence/presenceClient';
import { Token } from '../../components/3d/Depth';
import { ease, spring } from '../../components/animations/motion';
import { DemoTag, EmptyState, FocusTitle, Notice, StatusBadge, Tabs } from '../../components/ui/Controls';
import { Icon } from '../../components/ui/Icon';
import { Modal } from '../../components/ui/Overlay';
import { useToast } from '../../components/ui/Toasts';
import type { Slot } from '../../features/bookings/availability';
import { useI18n } from '../../i18n/I18nProvider';
import { ApiError } from '../../services/http';
import { useStore } from '../../state/AppStore';
import { formatDate, formatTime, isUpcoming, TIME_ZONES } from '../../utils/format';
import { teachingDays } from '../public/PublicPages';
import { PageHead } from './LearnerPages';

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};

/** Month calendar; days before the demo "today" are disabled. */
function Calendar({ value, onChange, hasSlots }: { value: string | null; onChange: (d: string) => void; hasSlots: (d: string) => boolean }) {
  const { lang } = useI18n();
  const [month, setMonth] = useState(DEMO_TODAY.slice(0, 7));
  const first = new Date(`${month}-01T00:00:00Z`);
  const offset = (first.getUTCDay() + 6) % 7;
  const daysIn = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const shift = (n: number) => {
    const d = new Date(first);
    d.setUTCMonth(d.getUTCMonth() + n);
    setMonth(iso(d).slice(0, 7));
  };
  const weekdays = lang === 'fr' ? ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'] : ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  return (
    <div>
      <div className="row between" style={{ marginBottom: 12 }}>
        <button className="icon-btn" onClick={() => shift(-1)} disabled={month <= DEMO_TODAY.slice(0, 7)} aria-label="Previous month"><Icon name="chevronLeft" size={16} /></button>
        <AnimatePresence mode="wait">
          <motion.strong key={month} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} style={{ textTransform: 'capitalize' }}>
            {formatDate(`${month}-01`, lang, { month: 'long', year: 'numeric' })}
          </motion.strong>
        </AnimatePresence>
        <button className="icon-btn" onClick={() => shift(1)} aria-label="Next month"><Icon name="chevronRight" size={16} /></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center' }}>
        {weekdays.map((w) => (
          <span key={w} className="tiny muted" style={{ fontWeight: 700, padding: '4px 0' }}>{w}</span>
        ))}
        {Array.from({ length: offset }, (_, i) => <span key={`e${i}`} />)}
        {Array.from({ length: daysIn }, (_, i) => {
          const date = `${month}-${String(i + 1).padStart(2, '0')}`;
          const past = date < DEMO_TODAY;
          const open = !past && hasSlots(date);
          const selected = value === date;
          return (
            <button
              key={date}
              disabled={!open}
              onClick={() => onChange(date)}
              aria-pressed={selected}
              aria-label={formatDate(date, lang, { weekday: 'long', day: 'numeric', month: 'long' })}
              style={{
                position: 'relative',
                aspectRatio: '1',
                borderRadius: 12,
                border: 0,
                cursor: open ? 'pointer' : 'default',
                background: selected ? 'var(--burgundy)' : 'transparent',
                color: selected ? '#fff' : open ? 'var(--navy)' : 'var(--ivory-300)',
                fontWeight: open ? 700 : 500,
                fontSize: 14,
              }}
            >
              {i + 1}
              {open && !selected && <span style={{ position: 'absolute', bottom: 5, left: '50%', width: 4, height: 4, borderRadius: 4, background: 'var(--gold)', transform: 'translateX(-50%)' }} />}
              {date === DEMO_TODAY && !selected && <span style={{ position: 'absolute', inset: 3, borderRadius: 10, border: '1px solid var(--line-strong)' }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SlotPicker({ tutor, date, value, onChange }: { tutor: Tutor; date: string; value: string | null; onChange: (s: string) => void }) {
  const { t, lang } = useI18n();
  const { actions, bookings, availability } = useStore();
  const [slots, setSlots] = useState<Slot[] | null>(null);
  useEffect(() => {
    let live = true;
    setSlots(null);
    actions.availabilityFor(tutor.id, date).then((s) => live && setSlots(s)).catch(() => live && setSlots([]));
    return () => {
      live = false;
    };
  }, [tutor.id, date, bookings, availability]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!slots)
    return (
      <div className="stack" style={{ ['--gap' as string]: '8px' }} aria-busy="true" aria-label={lang === 'fr' ? 'Chargement des créneaux' : 'Loading times'}>
        {[0, 1, 2].map((i) => <span key={i} className="skeleton" style={{ height: 44 }} />)}
      </div>
    );
  if (!slots.length) return <p className="small muted">{t('book.noTimes')}</p>;
  return (
    <div className="stack" style={{ ['--gap' as string]: '8px' }}>
      {slots.map((s, i) => (
        <motion.button
          key={s.start}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05, ...spring.settle }}
          disabled={!s.available}
          onClick={() => onChange(s.start)}
          aria-pressed={value === s.start}
          aria-label={`${formatTime(s.start, lang)} — ${s.available ? '60 min' : (s.reason as string) === 'out-of-office' ? (lang === 'fr' ? 'tuteur absent' : 'tutor out of office') : s.reason === 'calendar' ? (lang === 'fr' ? 'tuteur indisponible' : 'tutor unavailable') : lang === 'fr' ? 'réservé' : 'booked'}`}
          className="btn"
          style={{
            justifyContent: 'space-between',
            borderRadius: 12,
            background: value === s.start ? 'var(--burgundy)' : '#fff',
            color: value === s.start ? '#fff' : s.available ? 'var(--navy)' : 'var(--muted)',
            border: `1px solid ${value === s.start ? 'var(--burgundy)' : 'var(--line-strong)'}`,
            textDecoration: s.available ? 'none' : 'line-through',
          }}
        >
          <span className="num">{formatTime(s.start, lang)}</span>
          <span className="tiny">{s.available ? '60 min' : (s.reason as string) === 'out-of-office' ? (lang === 'fr' ? 'Absent·e' : 'Out of office') : s.reason === 'calendar' ? (lang === 'fr' ? 'Indisponible' : 'Unavailable') : lang === 'fr' ? 'Réservé' : 'Booked'}</span>
        </motion.button>
      ))}
    </div>
  );
}

export function BookPage() {
  const { t, l, lang } = useI18n();
  const toast = useToast();
  const [params] = useSearchParams();
  const { learner, actions, availability, bookings, content } = useStore();
  const [purpose, setPurpose] = useState<SessionPurpose>(() => (params.get('purpose') as SessionPurpose) || 'conversation');
  const myGroup = content.cohorts.find((g) => g.memberIds.includes(learner.id));
  const missed = myGroup ? missedSessions(myGroup, learner.id, nowIso()) : [];
  const [missedId, setMissedId] = useState<string>(() => params.get('session') ?? missed[missed.length - 1]?.id ?? '');
  const cost = sessionCost(bookings, learner.id, purpose);
  const [tutor, setTutor] = useState<Tutor>(() => TUTORS.find((tu) => tu.id === params.get('tutor')) ?? TUTORS[0]);
  const [date, setDate] = useState<string | null>(null);
  const [start, setStart] = useState<string | null>(null);
  const [topic, setTopic] = useState('Conversation — préparation de réunion');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Booking | null>(null);

  const hours = availability[tutor.id] ?? tutor.availability;
  const stage = !date ? 1 : !start ? 2 : 3;
  // Days during the tutor's current time off are closed (the server refuses them too).
  const presence = usePresence(tutor.id);
  const awayUntil = presence?.status === 'out-of-office' && presence.until ? presence.until.slice(0, 10) : null;
  const hasSlots = (d: string) => (!awayUntil || d >= awayUntil) && (hours[((new Date(`${d}T00:00:00Z`).getUTCDay() + 6) % 7) + 1] ?? []).length > 0;

  const confirm = async () => {
    if (!start) return;
    setBusy(true);
    setError(null);
    try {
      const booking = await actions.bookLesson({ tutorId: tutor.id, start, topic, purpose, missedSessionId: purpose === 'catch-up' ? missedId : undefined });
      setConfirmed(booking);
      toast(t('book.confirmed'));
    } catch (e) {
      setError(e instanceof ApiError && e.code === 'insufficient_credits' ? t('book.needCredits') : e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (confirmed) {
    return (
      <motion.div className="card stack center" style={{ maxWidth: 560, margin: '40px auto', textAlign: 'center', ['--pad' as string]: '40px', boxShadow: 'var(--shadow-3)' }} initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={spring.settle}>
        <motion.div initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ ...spring.snappy, delay: 0.2 }}>
          <Token size={72} state="earned"><Icon name="check" size={32} stroke={2.4} /></Token>
        </motion.div>
        <FocusTitle style={{ fontSize: '1.8rem' }}>{t('book.confirmed')}</FocusTitle>
        <p className="muted">{t('book.confirmedSub')}</p>
        <div className="card card-ivory" style={{ width: '100%', textAlign: 'left' }}>
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <Avatar spec={tutor.portrait} size={44} expression="joy" />
            <div>
              <div style={{ fontWeight: 700 }}>{tutor.name}</div>
              <div className="small muted">{formatDate(confirmed.start, lang, { weekday: 'long', day: 'numeric', month: 'long' })} · {formatTime(confirmed.start, lang)}</div>
              <div className="small" lang="fr">{confirmed.topic}</div>
            </div>
          </div>
        </div>
        <div style={{ width: '100%', textAlign: 'left' }}>
          <h3 className="kicker" style={{ marginBottom: 8 }}>{lang === 'fr' ? 'Et ensuite' : 'What happens next'}</h3>
          <ul className="next-list small">
            <li><Icon name="checkCircle" size={16} /> {confirmed.freeIntro ? (lang === 'fr' ? 'Séance offerte : votre première conversation.' : 'Free session: your first conversation.') : lang === 'fr' ? '1 crédit utilisé.' : '1 credit used.'} {lang === 'fr' ? 'Elle apparaît dans « Mes séances ».' : 'It now appears in My lessons.'}</li>
            <li><Icon name="meet" size={16} /> {t('demo.teams')}</li>
            <li><Icon name="bell" size={16} /> {lang === 'fr' ? 'Un rappel d’exemple a été ajouté à vos notifications — aucun message réel n’a été envoyé.' : 'A sample reminder was added to your notifications — no real message was sent.'}</li>
            <li><Icon name="clock" size={16} /> {lang === 'fr' ? 'Vous pouvez déplacer ou annuler depuis « Mes séances ».' : 'You can reschedule or cancel from My lessons.'}</li>
          </ul>
        </div>
        <div className="row" style={{ justifyContent: 'center' }}>
          <Link to="/app/lessons" className="btn btn-primary">{t('book.viewLessons')}</Link>
          <button className="btn btn-secondary" onClick={() => { setConfirmed(null); setStart(null); setDate(null); }}>{t('book.another')}</button>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <PageHead title={t('book.title')} sub={t('book.sub')}>
        <TimeZonePicker />
        <span className="chip chip-gold"><Icon name="calendar" size={14} /> {learner.credits} {t('dash.credits').toLowerCase()}</span>
      </PageHead>

      <ol className="stepper" aria-label={lang === 'fr' ? 'Étapes de réservation' : 'Booking steps'}>
        {[t('book.step1'), lang === 'fr' ? 'Date' : 'Date', lang === 'fr' ? 'Heure' : 'Time', t('book.step3')].map((label, i) => {
          const state = i < stage ? 'done' : i === stage ? 'current' : 'todo';
          return (
            <li key={label} data-state={state} aria-current={state === 'current' ? 'step' : undefined}>
              <span className="step-dot">{state === 'done' ? <Icon name="check" size={12} stroke={2.6} /> : i + 1}</span>
              {label}
            </li>
          );
        })}
      </ol>

      {/* 0 — what the session is for */}
      <div className="purpose-grid" role="radiogroup" aria-label={lang === 'fr' ? 'Objet de la séance' : 'What is this session for?'}>
        {(Object.keys(SESSION_PURPOSES) as SessionPurpose[]).map((pp) => {
          const pc = sessionCost(bookings, learner.id, pp);
          const disabled = pp === 'catch-up' && !missed.length;
          return (
            <button key={pp} type="button" role="radio" aria-checked={purpose === pp} disabled={disabled} className="purpose-card" onClick={() => setPurpose(pp)}>
              <span className="row between" style={{ flexWrap: 'nowrap' }}><strong>{l(SESSION_PURPOSES[pp].title)}</strong><span className={`chip ${pc.freeIntro ? 'chip-gold' : ''}`}>{pc.freeIntro ? (lang === 'fr' ? 'Offerte' : 'Free') : lang === 'fr' ? '1 crédit' : '1 credit'}</span></span>
              <span className="tiny muted">{disabled ? (lang === 'fr' ? 'Aucune classe de groupe manquée.' : 'No missed group class.') : l(SESSION_PURPOSES[pp].body)}</span>
            </button>
          );
        })}
      </div>
      {purpose === 'catch-up' && missed.length > 0 && (
        <label className="field" style={{ maxWidth: 420, marginBottom: 18 }}>
          <span className="label">{lang === 'fr' ? 'Classe manquée' : 'Missed class'}</span>
          <select className="select" value={missedId} onChange={(e) => setMissedId(e.target.value)}>
            {missed.map((s) => <option key={s.id} value={s.id}>{formatDate(s.start, lang, { weekday: 'short', day: 'numeric', month: 'short' })} · {s.topic}</option>)}
          </select>
          <span className="tiny muted">{lang === 'fr' ? 'Les classes ne sont pas enregistrées : votre tuteur reprend avec vous ce que le groupe a vu.' : 'Group classes aren’t recorded: your tutor takes you through what the group covered.'}</span>
        </label>
      )}

      {/* 1 — tutor */}
      <div className="row" style={{ ['--gap' as string]: '10px', marginBottom: 20, overflowX: 'auto', flexWrap: 'nowrap', paddingBottom: 6 }}>
        {TUTORS.map((tu) => (
          <button
            key={tu.id}
            onClick={() => { setTutor(tu); setDate(null); setStart(null); }}
            aria-pressed={tutor.id === tu.id}
            className="card row"
            style={{ ['--pad' as string]: '10px 16px 10px 10px', cursor: 'pointer', flex: 'none', flexWrap: 'nowrap', borderColor: tutor.id === tu.id ? 'var(--burgundy)' : undefined, boxShadow: tutor.id === tu.id ? '0 0 0 1px var(--burgundy), var(--shadow-2)' : undefined }}
          >
            <TutorAvatar tutorId={tu.id} spec={tu.portrait} size={40} />
            <span style={{ textAlign: 'left' }}>
              <span style={{ display: 'block', fontWeight: 700, fontSize: 14 }}>{tu.name}</span>
              <span className="tiny muted">{tu.specialities.slice(0, 2).join(' · ')}</span>
            </span>
          </button>
        ))}
      </div>
      <p className="small" style={{ marginTop: -8, marginBottom: 18 }}><Link to={`/app/tutors/${tutor.id}`} className="link">{lang === 'fr' ? `Voir le profil de ${tutor.name}` : `View ${tutor.name}’s profile`}</Link> · <Link to="/app/tutors" className="link">{lang === 'fr' ? 'Tous les tuteurs' : 'All tutors'}</Link></p>

      <div className="booking-layout">
        <div className="booking-main">
        {/* 2 — date & time, side by side in one card */}
        <div className="card when-card">
          <div>
            <h2 className="h4" style={{ marginBottom: 12 }}>{t('book.selectDate')}</h2>
            <Calendar value={date} onChange={(d) => { setDate(d); setStart(null); }} hasSlots={hasSlots} />
          </div>
          <div className="when-times">
            <h2 className="h4" style={{ marginBottom: 12 }}>{t('book.times')}</h2>
            {date ? <SlotPicker tutor={tutor} date={date} value={start} onChange={setStart} /> : <p className="small muted">{lang === 'fr' ? 'Choisissez d’abord une date dans le calendrier.' : 'Pick a date in the calendar first.'}</p>}
          </div>
        </div>
        {/* tutor profile */}
        <motion.div key={tutor.id} className="card stack" style={{ ['--gap' as string]: '12px' }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: ease.out }}>
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <TutorAvatar tutorId={tutor.id} spec={tutor.portrait} size={64} expression="smile" />
            <div>
              <h2 className="h3" style={{ fontSize: '1.2rem' }}>{tutor.name}</h2>
              <TutorStatusLine tutorId={tutor.id} />
              <div className="tiny muted">{l(tutor.title)}</div>
              <div className="row tiny" style={{ ['--gap' as string]: '4px', marginTop: 4 }}>
                <span style={{ color: 'var(--gold-600)' }}><Icon name="star" size={13} /></span> {tutor.rating} ({tutor.reviews}) <DemoTag />
              </div>
            </div>
          </div>
          <p className="small" style={{ color: 'var(--ink-2)' }}>{l(tutor.bio)}</p>
          <div className="row" style={{ ['--gap' as string]: '6px' }}>
            {tutor.specialities.map((s) => <span key={s} className="chip">{s}</span>)}
            <span className="chip chip-outline">{tutor.levels}</span>
          </div>
          <p className="tiny muted"><Icon name="calendar" size={13} /> {lang === 'fr' ? 'Enseigne le' : 'Teaches on'} {teachingDays(tutor, lang)} · {lang === 'fr' ? 'heure du Ghana (GMT)' : 'Ghana time (GMT)'}</p>
        </motion.div>

        </div>

        {/* 3 — review */}
        <div className="card stack booking-summary" style={{ ['--gap' as string]: '14px' }}>
          <h2 className="h4">{t('book.summary')}</h2>
          <div className="small stack" style={{ ['--gap' as string]: '8px' }}>
            <Row k={t('book.step1')} v={tutor.name} />
            <Row k={t('billing.date')} v={start ? `${formatDate(start, lang, { weekday: 'short', day: 'numeric', month: 'short' })} · ${formatTime(start, lang)}` : '—'} />
            <Row k={lang === 'fr' ? 'Format' : 'Format'} v={t('book.private')} />
            <Row k={lang === 'fr' ? 'Objet' : 'Purpose'} v={l(SESSION_PURPOSES[purpose].title)} />
            <Row k={lang === 'fr' ? 'Coût' : 'Cost'} v={cost.freeIntro ? (lang === 'fr' ? 'Offerte · première conversation' : 'Free · your first conversation') : lang === 'fr' ? '1 crédit' : '1 credit'} />
            <Row k={lang === 'fr' ? 'Crédits après réservation' : 'Credits after booking'} v={`${learner.credits} → ${Math.max(0, learner.credits - cost.credits)}`} />
            <Row k={lang === 'fr' ? 'Enregistrement' : 'Recording'} v={lang === 'fr' ? 'Aucun : les séances ne sont pas enregistrées' : 'None: sessions are not recorded'} />
          </div>
          <label className="field">
            <span className="label">{t('book.topic')}</span>
            <input className="input" lang="fr" value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={140} />
          </label>
          {!start && <p className="tiny muted">{lang === 'fr' ? 'Choisissez une date puis une heure pour confirmer.' : 'Choose a date, then a time, to confirm.'}</p>}
          {learner.credits < cost.credits ? (
            <>
              <Notice>{t('book.needCredits')}</Notice>
              <Link to="/app/billing" className="btn btn-primary">{t('book.getCredits')}</Link>
            </>
          ) : (
            <button className="btn btn-primary" disabled={!start || topic.trim().length < 2} aria-busy={busy} onClick={confirm}>
              {busy ? (lang === 'fr' ? 'Réservation…' : 'Booking…') : t('book.confirm')}
            </button>
          )}
          {error && <p className="field-error" role="alert">{error}</p>}
        </div>
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="row between" style={{ flexWrap: 'nowrap' }}>
      <span className="muted">{k}</span>
      <span style={{ fontWeight: 600, textAlign: 'right' }}>{v}</span>
    </div>
  );
}

/** Lets learners and tutors in different countries see lesson times on their own clock. */
export function TimeZonePicker() {
  const { lang } = useI18n();
  const { timeZone, actions } = useStore();
  return (
    <label className="row tiny" style={{ ['--gap' as string]: '6px', flexWrap: 'nowrap' }}>
      <Icon name="globe" size={15} />
      <span className="sr-only">{lang === 'fr' ? 'Fuseau horaire' : 'Time zone'}</span>
      <select className="select" style={{ minHeight: 34, padding: '4px 10px', width: 'auto', fontSize: 13 }} value={timeZone} onChange={(e) => actions.setTimeZone(e.target.value)}>
        {TIME_ZONES.map((z) => <option key={z.id} value={z.id}>{z.label}</option>)}
      </select>
    </label>
  );
}

export function MyLessonsPage() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const { bookings, learner, actions } = useStore();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [cancelling, setCancelling] = useState<Booking | null>(null);
  const [moving, setMoving] = useState<Booking | null>(null);
  const [newDate, setNewDate] = useState<string>(addDays(DEMO_TODAY, 1));
  const [newStart, setNewStart] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [reason, setReason] = useState('');
  const [emergency, setEmergency] = useState(false);
  const fr = lang === 'fr';

  const mine = bookings.filter((b) => b.learnerId === learner.id);
  const summary = (b: Booking) => {
    const tu = TUTORS.find((x) => x.id === b.tutorId)!;
    return (
      <div className="card card-ivory" style={{ ['--pad' as string]: '12px 14px', marginBottom: 14 }}>
        <div style={{ fontWeight: 700 }} lang="fr">{b.topic}</div>
        <div className="small muted">{tu.name} · {formatDate(b.start, lang, { weekday: 'long', day: 'numeric', month: 'long' })} · {formatTime(b.start, lang)}</div>
      </div>
    );
  };
  const list = useMemo(
    () =>
      tab === 'upcoming'
        ? mine.filter((b) => b.status === 'confirmed' && isUpcoming(b.start)).sort((a, b) => a.start.localeCompare(b.start))
        : mine.filter((b) => b.status !== 'confirmed' || !isUpcoming(b.start)).sort((a, b) => b.start.localeCompare(a.start)),
    [mine, tab],
  );

  const run = async (fn: () => Promise<void>, ok: string) => {
    setError(null);
    setWorking(true);
    try {
      await fn();
      toast(ok);
      setCancelling(null);
      setMoving(null);
      setNewStart(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setWorking(false);
    }
  };

  const next14 = Array.from({ length: 14 }, (_, i) => addDays(DEMO_TODAY, i + 1));

  return (
    <>
      <PageHead title={t('lessons.title')}>
        <Link to="/app/book" className="btn btn-primary btn-sm"><Icon name="plus" size={15} /> {t('app.book')}</Link>
      </PageHead>
      <div className="row between" style={{ marginBottom: 4 }}>
        <Tabs label={t('lessons.title')} value={tab} onChange={setTab} options={[{ value: 'upcoming', label: t('lessons.upcoming') }, { value: 'past', label: t('lessons.past') }]} />
        <TimeZonePicker />
      </div>
      <p className="tiny muted" style={{ marginTop: 10 }}>
        {fr
          ? `Déplacement ou annulation gratuits jusqu’à 24 h avant. Vous pouvez rejoindre jusqu’à ${BOOKING_POLICY.graceMinutes} min après le début ; la séance se termine à l’heure prévue.`
          : `Free to reschedule or cancel up to 24 hours before. You can join up to ${BOOKING_POLICY.graceMinutes} minutes late; the lesson still ends on time.`}
      </p>
      <div className="stack" style={{ ['--gap' as string]: '12px', marginTop: 18 }}>
        <AnimatePresence initial={false} mode="popLayout">
          {list.map((b) => {
            const tutor = TUTORS.find((tu) => tu.id === b.tutorId)!;
            return (
              <motion.div key={b.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={spring.settle} className="card row" style={{ flexWrap: 'wrap', ['--gap' as string]: '18px' }}>
                <div style={{ textAlign: 'center', width: 64, padding: '8px 0', borderRadius: 14, background: 'var(--ivory)' }}>
                  <div className="tiny" style={{ fontWeight: 700, textTransform: 'uppercase', color: 'var(--burgundy)' }}>{formatDate(b.start, lang, { month: 'short' })}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, lineHeight: 1 }}>{formatDate(b.start, lang, { day: 'numeric' })}</div>
                </div>
                <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }} lang="fr">{b.topic}</div>
                  <div className="small muted row" style={{ ['--gap' as string]: '8px' }}>
                    <Avatar spec={tutor.portrait} size={22} /> {tutor.name} · {formatTime(b.start, lang)} · {b.durationMin} {t('common.min')} · {b.kind === 'group' ? (lang === 'fr' ? 'Groupe' : 'Group') : (lang === 'fr' ? 'Privé' : 'Private')}
                  </div>
                  {b.rescheduledFrom && <div className="tiny muted">{t('lessons.rescheduled')} · {formatDate(b.rescheduledFrom, lang)}</div>}
                  {b.cancellation && (
                    <div className="tiny muted">
                      {b.cancellation.creditRefunded ? (fr ? 'Crédit restitué' : 'Credit returned') : b.cancellation.review === 'pending' ? (fr ? 'Urgence en cours d’examen' : 'Emergency under review') : fr ? 'Crédit utilisé (moins de 24 h)' : 'Credit used (under 24 h)'}
                    </div>
                  )}
                </div>
                {b.status === 'confirmed' && isUpcoming(b.start) ? (
                  <div className="row" style={{ ['--gap' as string]: '6px' }}>
                    <span className="tiny muted row" style={{ ['--gap' as string]: '4px' }} title={t('demo.teams')}><Icon name="meet" size={15} /> {t('demo.simulated')}</span>
                    {b.kind === 'private' && (
                      <>
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={!canReschedule(b, nowIso())}
                          title={canReschedule(b, nowIso()) ? undefined : fr ? 'Moins de 24 h : déplacement impossible en ligne' : 'Less than 24 hours away: can’t be moved online'}
                          onClick={() => { setMoving(b); setNewStart(null); setError(null); }}
                        >
                          {t('lessons.reschedule')}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setCancelling(b); setReason(''); setEmergency(false); setError(null); }}>{t('lessons.cancel')}</button>
                      </>
                    )}
                  </div>
                ) : (
                  <StatusBadge status={b.status === 'cancelled' ? 'cancelled' : 'completed'}>{b.status === 'cancelled' ? (lang === 'fr' ? 'Annulée' : 'Cancelled') : (lang === 'fr' ? 'Terminée' : 'Completed')}</StatusBadge>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        {!list.length && <div className="card"><EmptyState icon="calendar" title={t('lessons.empty')} /></div>}
      </div>

      <Modal open={!!cancelling} onClose={() => setCancelling(null)} title={t('lessons.cancel')} width={500}>
        {cancelling && (() => {
          const outcome = cancellationOutcome(cancelling, nowIso(), emergency);
          const free = outcome.kind === 'free';
          return (
            <div className="stack" style={{ ['--gap' as string]: '14px' }}>
              {summary(cancelling)}
              <div className={`policy-note${free ? '' : ' policy-note-warn'}`}>
                <Icon name={free ? 'checkCircle' : 'clock'} size={18} />
                <span>
                  {free
                    ? fr ? 'Plus de 24 h avant la séance : annulation gratuite, votre crédit est restitué.' : 'More than 24 hours before the lesson: free cancellation, your credit is returned.'
                    : fr ? 'Moins de 24 h avant la séance : le crédit est utilisé, sauf urgence validée par l’équipe.' : 'Less than 24 hours before the lesson: the credit is used, unless the team accepts an emergency.'}
                </span>
              </div>
              <label className="field">
                <span className="label">{fr ? 'Motif de l’annulation' : 'Reason for cancelling'}</span>
                <textarea className="textarea" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={fr ? 'Ex. déplacement professionnel imprévu' : 'e.g. unexpected work travel'} />
              </label>
              {!free || emergency ? (
                <label className="row small" style={{ ['--gap' as string]: '8px', flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                  <input type="checkbox" checked={emergency} onChange={(e) => setEmergency(e.target.checked)} style={{ marginTop: 3 }} />
                  <span>{fr ? 'C’est une urgence : demander à l’équipe de restituer mon crédit.' : 'This is an emergency: ask the team to restore my credit.'}</span>
                </label>
              ) : null}
              {error && <p className="field-error" role="alert">{error}</p>}
              <div className="row" style={{ justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setCancelling(null)}>{t('lessons.keep')}</button>
                <button
                  className="btn btn-primary"
                  disabled={reason.trim().length < 3}
                  aria-busy={working}
                  onClick={() =>
                    run(
                      async () => void (await actions.cancelLesson(cancelling.id, { reason, emergency: !free && emergency })),
                      free ? (fr ? 'Séance annulée · crédit restitué' : 'Lesson cancelled · credit returned') : emergency ? (fr ? 'Séance annulée · demande envoyée à l’équipe' : 'Lesson cancelled · request sent to the team') : fr ? 'Séance annulée · crédit utilisé' : 'Lesson cancelled · credit used',
                    )
                  }
                >
                  {t('lessons.yesCancel')}
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      <Modal open={!!moving} onClose={() => setMoving(null)} title={t('lessons.chooseNew')} width={560}>
        {moving && (
          <div className="stack" style={{ ['--gap' as string]: '16px' }}>
            <div>
              <span className="kicker">{lang === 'fr' ? 'Actuellement' : 'Currently'}</span>
              {summary(moving)}
            </div>
            <div className="row" role="group" aria-label={lang === 'fr' ? 'Nouvelle date' : 'New date'} style={{ overflowX: 'auto', flexWrap: 'nowrap', ['--gap' as string]: '6px', paddingBottom: 4 }}>
              {next14.map((d) => (
                <button key={d} aria-pressed={newDate === d} className={`chip ${newDate === d ? 'chip-navy' : 'chip-outline'}`} style={{ cursor: 'pointer', minHeight: 40, flex: 'none' }} onClick={() => { setNewDate(d); setNewStart(null); }}>
                  {formatDate(d, lang, { weekday: 'short', day: 'numeric' })}
                </button>
              ))}
            </div>
            <SlotPicker tutor={TUTORS.find((tu) => tu.id === moving.tutorId)!} date={newDate} value={newStart} onChange={setNewStart} />
            {error && <p className="field-error" role="alert">{error}</p>}
            <button className="btn btn-primary" disabled={!newStart} aria-busy={working} onClick={() => newStart && run(() => actions.rescheduleLesson(moving.id, newStart), lang === 'fr' ? 'Séance déplacée' : 'Lesson rescheduled')}>
              {t('lessons.reschedule')}
            </button>
          </div>
        )}
      </Modal>
    </>
  );
}

/** The selected tutor's status, and what it means for booking. */
function TutorStatusLine({ tutorId }: { tutorId: string }) {
  const { lang } = useI18n();
  const p = usePresence(tutorId);
  return (
    <div className="pz-line" style={{ marginTop: 4 }}>
      <PresenceBadge tutorId={tutorId} />
      <span className="pz-hint">{p?.status === 'out-of-office' ? (lang === 'fr' ? 'Ses créneaux sont fermés pendant son absence.' : 'Their slots are closed while they’re away.') : presenceHint(p, lang)}</span>
    </div>
  );
}
