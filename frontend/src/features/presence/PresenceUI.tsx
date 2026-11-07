import { BREAK_MINUTES, nowIso, OOO_REASONS, PresenceError, type OooReason, type PortraitSpec, type ResolvedPresence } from '@laporte/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Avatar } from '../../components/3d/Portrait';
import { Icon } from '../../components/ui/Icon';
import { useToast } from '../../components/ui/Toasts';
import { useI18n } from '../../i18n/I18nProvider';
import { formatDate, formatTime } from '../../utils/format';
import { changePresence, useMyPresenceRecord, usePresence } from './presenceClient';

type Lang = 'en' | 'fr';

/** "Online", "On break · back around 15:40", "Out of office · back Tue 10 Nov", "Offline". */
export function presenceText(p: ResolvedPresence | undefined, lang: Lang, opts: { short?: boolean } = {}) {
  const fr = lang === 'fr';
  if (!p) return fr ? 'Hors ligne' : 'Offline';
  switch (p.status) {
    case 'online':
      return p.inSession ? (fr ? 'En séance' : 'In a session') : fr ? 'En ligne' : 'Online';
    case 'on-break':
      if (opts.short || !p.until) return fr ? 'En pause' : 'On break';
      return fr ? `En pause · de retour vers ${formatTime(p.until, lang)}` : `On break · back around ${formatTime(p.until, lang)}`;
    case 'out-of-office': {
      if (opts.short || !p.until) return fr ? 'Absent·e' : 'Out of office';
      const back = formatDate(p.until, lang, { weekday: 'short', day: 'numeric', month: 'short' });
      return fr ? `Absent·e · de retour le ${back}` : `Out of office · back ${back}`;
    }
    default:
      return fr ? 'Hors ligne' : 'Offline';
  }
}

/** What a learner can expect, under the status. */
export function presenceHint(p: ResolvedPresence | undefined, lang: Lang) {
  const fr = lang === 'fr';
  if (!p || p.status === 'offline') return fr ? 'Votre message l’attendra : réponse en général sous 24 h.' : 'Your message will wait for them: replies usually within 24 hours.';
  if (p.status === 'online') return p.inSession ? (fr ? 'Répondra après sa séance.' : 'Will reply after their session.') : fr ? 'Répond en général rapidement.' : 'Usually replies quickly.';
  if (p.status === 'on-break') return fr ? 'Répondra après sa pause.' : 'Will reply after their break.';
  return `${p.reason ? OOO_REASONS[p.reason][lang] : ''}${fr ? ' · pas de réservation pendant son absence.' : ' · no bookings while they are away.'}`;
}

/** Small coloured dot with an accessible label (colour is never the only signal: text sits nearby or in the title). */
export function PresenceDot({ tutorId, className = '' }: { tutorId: string; className?: string }) {
  const { lang } = useI18n();
  const p = usePresence(tutorId);
  if (!p) return null; // not loaded yet: show nothing rather than a wrong 'Offline'
  const label = presenceText(p, lang);
  return <span className={`pz-dot ${className}`} data-status={p?.status ?? 'offline'} data-session={p?.inSession || undefined} role="img" aria-label={label} title={label} />;
}

/** A tutor's avatar with their status dot on it. */
export function TutorAvatar({ tutorId, spec, size = 40, expression }: { tutorId: string; spec: PortraitSpec; size?: number; expression?: Parameters<typeof Avatar>[0]['expression'] }) {
  return (
    <span className="pz-avatar" style={{ ['--pz-size' as string]: `${size}px` }}>
      <Avatar spec={spec} size={size} expression={expression} />
      <PresenceDot tutorId={tutorId} />
    </span>
  );
}

/** Status as a soft chip: dot + text. */
export function PresenceBadge({ tutorId, short }: { tutorId: string; short?: boolean }) {
  const { lang } = useI18n();
  const p = usePresence(tutorId);
  if (!p) return null;
  return (
    <span className="pz-badge" data-status={p?.status ?? 'offline'}>
      <span className="pz-dot pz-dot-inline" data-status={p?.status ?? 'offline'} data-session={p?.inSession || undefined} aria-hidden />
      {presenceText(p, lang, { short })}
    </span>
  );
}

/* ---------------- Tutor: the status menu in the top bar ---------------- */

const todayAt = (h: number, addDays = 0) => {
  const d = new Date(nowIso());
  d.setUTCDate(d.getUTCDate() + addDays);
  d.setUTCHours(h, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};

export function StatusMenu({ tutorId }: { tutorId: string }) {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const toast = useToast();
  const p = usePresence(tutorId);
  const [open, setOpen] = useState(false);
  const [ooo, setOoo] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  const run = async (change: Parameters<typeof changePresence>[1], ok: string) => {
    try {
      await changePresence(tutorId, change);
      toast(ok);
      setOpen(false);
    } catch (e) {
      toast(e instanceof PresenceError || e instanceof Error ? e.message : String(e));
    }
  };

  const auto = p?.source !== 'manual';
  return (
    <div className="pz-menu-wrap" ref={box}>
      <button type="button" className="pz-trigger" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="pz-dot pz-dot-inline" data-status={p?.status ?? 'offline'} data-session={p?.inSession || undefined} aria-hidden />
        <span className="pz-trigger-text">{presenceText(p, lang, { short: true })}</span>
        <Icon name="chevronDown" size={14} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="pz-menu" role="menu" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }}>
            <div className="pz-menu-now">
              <strong>{presenceText(p, lang)}</strong>
              <span className="tiny muted">{auto
                ? (fr ? 'Réglé automatiquement selon votre activité.' : 'Set automatically from your activity.')
                : (fr ? 'Choisi par vous. Les apprenants le voient.' : 'Set by you. Learners can see it.')}</span>
            </div>
            <button type="button" role="menuitem" className="pz-item" onClick={() => void run({ kind: 'online' }, fr ? 'Vous êtes en ligne' : 'You’re online')}>
              <span className="pz-dot pz-dot-inline" data-status="online" aria-hidden /> {fr ? 'En ligne (automatique)' : 'Online (automatic)'}
            </button>
            <div className="pz-item pz-item-group" role="group" aria-label={fr ? 'Pause' : 'Break'}>
              <span className="pz-dot pz-dot-inline" data-status="on-break" aria-hidden /> {fr ? 'Pause' : 'On break'}
              <span className="pz-chips">
                {BREAK_MINUTES.map((m) => <button key={m} type="button" role="menuitem" className="pz-chip" onClick={() => void run({ kind: 'break', minutes: m }, fr ? `Pause de ${m} min` : `${m}-minute break`)}>{m} min</button>)}
                <button type="button" role="menuitem" className="pz-chip" onClick={() => void run({ kind: 'break', minutes: null }, fr ? 'En pause' : 'On break')}>{fr ? 'Jusqu’à mon retour' : 'Until I’m back'}</button>
              </span>
            </div>
            <button type="button" role="menuitem" className="pz-item" onClick={() => { setOoo(true); setOpen(false); }}>
              <span className="pz-dot pz-dot-inline" data-status="out-of-office" aria-hidden /> {fr ? 'Absent·e (congé, formation…)' : 'Out of office (leave, training…)'}
            </button>
            <button type="button" role="menuitem" className="pz-item" onClick={() => void run({ kind: 'offline' }, fr ? 'Vous apparaissez hors ligne' : 'You appear offline')}>
              <span className="pz-dot pz-dot-inline" data-status="offline" aria-hidden /> {fr ? 'Apparaître hors ligne' : 'Appear offline'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {ooo && <TimeOffDialog tutorId={tutorId} onClose={() => setOoo(false)} />}
    </div>
  );
}

/** Choose out-of-office dates and a reason (from a list: no free text, so no contact details). */
export function TimeOffDialog({ tutorId, onClose }: { tutorId: string; onClose: () => void }) {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const toast = useToast();
  const [from, setFrom] = useState(todayAt(0));
  const [until, setUntil] = useState(todayAt(0, 3));
  const [reason, setReason] = useState<OooReason>('holiday');
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    setError(null);
    try {
      // From the start of the first day (or now, if it's today) to the start of the return day.
      const start = from === todayAt(0) ? nowIso() : `${from}T00:00:00.000Z`;
      await changePresence(tutorId, { kind: 'out-of-office', from: start, until: `${until}T00:00:00.000Z`, reason });
      toast(fr ? 'Absence enregistrée : vos créneaux sont fermés à ces dates.' : 'Time off saved: your slots are closed on those dates.');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  return (
    <div className="pz-scrim" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div className="pz-dialog" role="dialog" aria-modal="true" aria-labelledby="pz-ooo-title" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h2 id="pz-ooo-title" className="h4">{fr ? 'Absent·e du bureau' : 'Out of office'}</h2>
        <p className="small muted" style={{ margin: 0 }}>{fr ? 'Les apprenants voient votre absence et votre date de retour. Vos créneaux sont fermés pendant ces dates.' : 'Learners see that you’re away and when you’re back. Your booking slots close for those dates.'}</p>
        <div className="pz-dates">
          <label className="field"><span className="label">{fr ? 'Du' : 'From'}</span><input className="input" type="date" value={from} min={todayAt(0)} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="field"><span className="label">{fr ? 'De retour le' : 'Back on'}</span><input className="input" type="date" value={until} min={from} onChange={(e) => setUntil(e.target.value)} /></label>
        </div>
        <fieldset className="pz-reasons">
          <legend className="label">{fr ? 'Raison' : 'Reason'}</legend>
          {(Object.keys(OOO_REASONS) as OooReason[]).map((r) => (
            <label key={r} className="pz-reason"><input type="radio" name="ooo-reason" checked={reason === r} onChange={() => setReason(r)} /> {OOO_REASONS[r][lang]}</label>
          ))}
        </fieldset>
        <p className="tiny muted" style={{ margin: 0 }}>{fr ? 'Les séances déjà réservées à ces dates restent : pensez à prévenir l’administration pour les réattribuer.' : 'Sessions already booked on those dates stay booked: let the admin team know so they can be reassigned.'}</p>
        {error && <p className="field-error" role="alert">{error}</p>}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>{fr ? 'Annuler' : 'Cancel'}</button>
          <button type="button" className="btn btn-primary" onClick={() => void save()}>{fr ? 'Enregistrer' : 'Save time off'}</button>
        </div>
      </motion.div>
    </div>
  );
}

/** Tutor's availability page: scheduled time off, with cancel. */
export function TimeOffCard({ tutorId }: { tutorId: string }) {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const toast = useToast();
  const rec = useMyPresenceRecord();
  const [adding, setAdding] = useState(false);
  const windows = (rec?.timeOff ?? []).filter((w) => Date.parse(w.until) > Date.parse(nowIso()));
  const fmt = (iso: string) => formatDate(iso, lang, { weekday: 'short', day: 'numeric', month: 'short' });
  return (
    <section className="card pz-timeoff" aria-labelledby="pz-to-h">
      <div className="card-head">
        <h2 id="pz-to-h" className="h4">{fr ? 'Absences' : 'Time off'}</h2>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAdding(true)}><Icon name="plus" size={14} /> {fr ? 'Ajouter' : 'Add time off'}</button>
      </div>
      {windows.length ? (
        <ul className="pz-to-list">
          {windows.map((w) => {
            const now = Date.parse(w.from) <= Date.parse(nowIso());
            return (
              <li key={w.id}>
                <span className="pz-dot pz-dot-inline" data-status="out-of-office" aria-hidden />
                <span style={{ flex: 1 }}><strong>{OOO_REASONS[w.reason][lang]}</strong><span className="tiny muted"> · {fmt(w.from)} → {fr ? 'retour' : 'back'} {fmt(w.until)}{now ? (fr ? ' · en cours' : ' · now') : ''}</span></span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => void changePresence(tutorId, now ? { kind: 'online' } : { kind: 'cancel-time-off', id: w.id }).then(() => toast(now ? (fr ? 'Bon retour !' : 'Welcome back!') : fr ? 'Absence annulée' : 'Time off cancelled'))}>{now ? (fr ? 'Je suis de retour' : 'I’m back') : fr ? 'Annuler' : 'Cancel'}</button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="small muted" style={{ margin: 0 }}>{fr ? 'Aucune absence prévue. Ajoutez vos congés pour fermer vos créneaux automatiquement.' : 'No time off planned. Add leave and your booking slots close automatically on those dates.'}</p>
      )}
      {adding && <TimeOffDialog tutorId={tutorId} onClose={() => setAdding(false)} />}
    </section>
  );
}
