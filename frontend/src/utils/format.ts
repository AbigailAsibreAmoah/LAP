import { DEMO_TODAY, nowIso, type Lang } from '@laporte/shared';

const locale = (lang: Lang) => (lang === 'fr' ? 'fr-FR' : 'en-GB');

// All times are stored in UTC (also Ghana's local time: GMT, no DST) and shown in the
// learner's chosen time zone, so tutors and learners in different countries see their own clock.
export const TIME_ZONES = [
  { id: 'Africa/Accra', label: 'Accra · Abidjan · Dakar (GMT)' },
  { id: 'Africa/Lagos', label: 'Lagos · Cotonou · Kinshasa (WAT)' },
  { id: 'Africa/Nairobi', label: 'Nairobi (EAT)' },
  { id: 'Africa/Johannesburg', label: 'Johannesburg (SAST)' },
  { id: 'Europe/London', label: 'London' },
  { id: 'Europe/Paris', label: 'Paris · Brussels' },
  { id: 'America/Toronto', label: 'Toronto · Montréal' },
  { id: 'America/New_York', label: 'New York' },
] as const;

let displayZone = 'Africa/Accra';
export function setDisplayTimeZone(tz: string) {
  displayZone = tz;
}
export const displayTimeZone = () => displayZone;

export function formatDate(iso: string, lang: Lang, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) {
  // Date-only values (YYYY-MM-DD) are calendar days, not instants: never shift them across zones.
  const timeZone = iso.length <= 10 ? 'UTC' : displayZone;
  return new Intl.DateTimeFormat(locale(lang), { timeZone, ...opts }).format(new Date(iso));
}

export function formatTime(iso: string, lang: Lang) {
  return new Intl.DateTimeFormat(locale(lang), { timeZone: displayZone, hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

export function formatGhs(amount: number, lang: Lang) {
  return `GH₵ ${new Intl.NumberFormat(locale(lang)).format(amount)}`;
}

export function formatNumber(n: number, lang: Lang) {
  return new Intl.NumberFormat(locale(lang)).format(n);
}

/** Days between the demo "today" and the given ISO date (0 = today). */
export function daysFromToday(iso: string) {
  const a = Date.UTC(+DEMO_TODAY.slice(0, 4), +DEMO_TODAY.slice(5, 7) - 1, +DEMO_TODAY.slice(8, 10));
  const d = new Date(iso);
  const b = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round((b - a) / 86_400_000);
}

/** Live clock (see shared/clock.ts). */
export { nowIso };
export const isUpcoming = (iso: string) => iso > nowIso();

export function relativeDay(iso: string, lang: Lang, t: (k: 'common.today' | 'common.tomorrow') => string) {
  const diff = daysFromToday(iso);
  if (diff === 0) return t('common.today');
  if (diff === 1) return t('common.tomorrow');
  return formatDate(iso, lang);
}

/** 150 → "2:30" */
export function formatClip(sec: number) {
  return `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;
}

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}
