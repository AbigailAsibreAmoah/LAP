import { COURSES, LEVEL_ORDER, TUTORS, TUTOR_PROFILES, type CefrLevel, type Proficiency, type Tutor } from '@laporte/shared';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Avatar } from '../../components/3d/Portrait';
import { EmptyState } from '../../components/ui/Controls';
import { Icon } from '../../components/ui/Icon';
import { useI18n } from '../../i18n/I18nProvider';
import { useStore } from '../../state/AppStore';
import { formatDate } from '../../utils/format';
import { PageHead } from './LearnerPages';

/* Learners look tutors up the way they would on a professional network: who they are, what
   they've done, what they teach, and what other learners say. No contact details are shown:
   learners book sessions and message through La Porte. */

const range = (levels: string): [number, number] => {
  const found = (levels.match(/[ABC][12]/g) ?? ['A1', 'C2']) as CefrLevel[];
  return [LEVEL_ORDER.indexOf(found[0]), LEVEL_ORDER.indexOf(found[found.length - 1])];
};
const teachesLevel = (t: Tutor, level: CefrLevel) => { const [a, b] = range(t.levels); const i = LEVEL_ORDER.indexOf(level); return i >= a && i <= b; };
const PROF: Record<Proficiency, { en: string; fr: string }> = {
  native: { en: 'Native', fr: 'Langue maternelle' },
  fluent: { en: 'Fluent', fr: 'Courant' },
  professional: { en: 'Professional', fr: 'Professionnel' },
  conversational: { en: 'Conversational', fr: 'Conversation' },
};

function Stars({ value }: { value: number }) {
  return <span className="tp-stars" aria-label={`${value} / 5`}>{'★'.repeat(Math.round(value))}<span>{'★'.repeat(5 - Math.round(value))}</span></span>;
}

/* ---------------- Directory ---------------- */

export function TutorsDirectoryPage() {
  const { l, lang } = useI18n();
  const fr = lang === 'fr';
  const { learner } = useStore();
  const [q, setQ] = useState('');
  const [mine, setMine] = useState(true);
  const [skill, setSkill] = useState('all');
  const skills = useMemo(() => [...new Set(TUTORS.flatMap((t) => t.specialities))], []);
  const list = TUTORS.filter((t) => {
    const p = TUTOR_PROFILES[t.id];
    const hay = `${t.name} ${t.specialities.join(' ')} ${l(t.title)} ${p ? l(p.headline) + ' ' + p.location : ''}`.toLowerCase();
    return hay.includes(q.toLowerCase()) && (!mine || teachesLevel(t, learner.level)) && (skill === 'all' || t.specialities.includes(skill));
  });
  return (
    <>
      <PageHead title={fr ? 'Nos tuteurs' : 'Our tutors'} sub={fr ? 'Découvrez le parcours, les spécialités et les avis de chaque tuteur, puis réservez une séance.' : 'See each tutor’s background, specialities and reviews, then book a session.'} />
      <div className="tp-filters">
        <label className="tp-search">
          <Icon name="search" size={17} />
          <span className="sr-only">{fr ? 'Rechercher un tuteur' : 'Search tutors'}</span>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={fr ? 'Nom, spécialité, ville…' : 'Name, speciality, city…'} />
        </label>
        <label className="kid-toggle tp-mine">
          <span>{fr ? `Enseigne mon niveau (${learner.level})` : `Teaches my level (${learner.level})`}</span>
          <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />
        </label>
      </div>
      <div className="row" style={{ ['--gap' as string]: '6px', marginBottom: 16 }} role="group" aria-label={fr ? 'Spécialité' : 'Speciality'}>
        {['all', ...skills].map((s) => (
          <button key={s} type="button" className={`chip ${skill === s ? 'chip-navy' : 'chip-outline'}`} style={{ cursor: 'pointer', minHeight: 32 }} aria-pressed={skill === s} onClick={() => setSkill(s)}>{s === 'all' ? (fr ? 'Toutes' : 'All') : s}</button>
        ))}
      </div>
      {list.length ? (
        <div className="tp-grid">
          {list.map((t) => {
            const p = TUTOR_PROFILES[t.id];
            return (
              <article key={t.id} className="tp-card">
                <div className="tp-card-cover" aria-hidden />
                <Avatar spec={t.portrait} size={76} />
                <h2 className="tp-card-name">{t.name}</h2>
                <p className="tp-card-headline">{p ? l(p.headline) : l(t.title)}</p>
                <p className="tiny muted">{p?.location ?? ''} · {t.levels}</p>
                <p className="tp-card-rating"><Stars value={t.rating} /> {t.rating} <span className="muted">({t.reviews})</span></p>
                <div className="tp-chips">{t.specialities.slice(0, 3).map((s) => <span key={s} className="chip chip-outline">{s}</span>)}</div>
                <div className="tp-card-actions">
                  <Link to={`/app/tutors/${t.id}`} className="btn btn-secondary btn-sm">{fr ? 'Voir le profil' : 'View profile'}</Link>
                  <Link to={`/app/book?tutor=${t.id}`} className="btn btn-primary btn-sm">{fr ? 'Réserver' : 'Book'}</Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="card"><EmptyState icon="users" title={fr ? 'Aucun tuteur ne correspond' : 'No tutors match'} /><div className="row" style={{ justifyContent: 'center', marginTop: 8 }}><button className="btn btn-ghost btn-sm" onClick={() => { setQ(''); setMine(false); setSkill('all'); }}>{fr ? 'Effacer les filtres' : 'Clear filters'}</button></div></div>
      )}
    </>
  );
}

/* ---------------- Profile ---------------- */

export function TutorProfilePage() {
  const { id } = useParams();
  const { l, lang } = useI18n();
  const fr = lang === 'fr';
  const { learner, threads, userId } = useStore();
  const t = TUTORS.find((x) => x.id === id);
  if (!t) return <div className="card"><EmptyState icon="user" title={fr ? 'Tuteur introuvable' : 'Tutor not found'} /><p style={{ textAlign: 'center' }}><Link to="/app/tutors" className="link">{fr ? 'Voir tous les tuteurs' : 'See all tutors'}</Link></p></div>;
  const p = TUTOR_PROFILES[t.id];
  const fits = teachesLevel(t, learner.level);
  const thread = threads.find((th) => th.participantIds.includes(userId) && th.participantIds.includes(t.id));
  const courses = COURSES.filter((c) => c.tutorId === t.id);
  const days = fr ? ['', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] : ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const others = TUTORS.filter((x) => x.id !== t.id);
  const maxEndorse = p ? Math.max(1, ...Object.values(p.endorsements)) : 1;
  return (
    <div className="tp-layout">
      <div className="tp-main">
        {/* Header card */}
        <section className="tp-section tp-top" aria-labelledby="tp-name">
          <div className="tp-cover" aria-hidden />
          <div className="tp-top-body">
            <span className="tp-avatar"><Avatar spec={t.portrait} size={128} /></span>
            <div className="tp-top-row">
              <div style={{ minWidth: 0 }}>
                <h1 id="tp-name" className="tp-name">{t.name}</h1>
                <p className="tp-headline">{p ? l(p.headline) : l(t.title)}</p>
                <p className="tp-meta">
                  {p && <><Icon name="globe" size={14} /> {p.location} · </>}
                  <Stars value={t.rating} /> {t.rating} · {t.reviews} {fr ? 'avis' : 'reviews'}
                  {p && <> · {fr ? 'chez La Porte depuis' : 'with La Porte since'} {p.since}</>}
                </p>
                <div className="tp-badges">
                  <span className={`chip ${fits ? 'chip-gold' : 'chip-outline'}`}>{fits ? (fr ? `✓ Enseigne votre niveau (${learner.level})` : `✓ Teaches your level (${learner.level})`) : fr ? `Niveaux ${t.levels}` : `Levels ${t.levels}`}</span>
                  {p && <span className="chip chip-outline">{fr ? 'Accent :' : 'Accent:'} {l(p.accent)}</span>}
                </div>
              </div>
              <div className="tp-actions">
                <Link to={`/app/book?tutor=${t.id}`} className="btn btn-primary"><Icon name="calendar" size={16} /> {fr ? 'Réserver une séance' : 'Book a session'}</Link>
                {thread ? <Link to={`/app/messages?thread=${thread.id}`} className="btn btn-secondary"><Icon name="message" size={16} /> {fr ? 'Message' : 'Message'}</Link> : <span className="tiny muted" style={{ maxWidth: 220 }}>{fr ? 'La messagerie s’ouvre après votre première séance.' : 'Messaging opens after your first session.'}</span>}
              </div>
            </div>
            {p && (
              <dl className="tp-stats">
                <div><dt>{fr ? 'Années d’enseignement' : 'Years teaching'}</dt><dd>{p.yearsTeaching}</dd></div>
                <div><dt>{fr ? 'Apprenants' : 'Learners taught'}</dt><dd>{p.learnersTaught}</dd></div>
                <div><dt>{fr ? 'Séances' : 'Sessions led'}</dt><dd>{p.sessionsLed.toLocaleString(fr ? 'fr-FR' : 'en-GB')}</dd></div>
              </dl>
            )}
          </div>
        </section>

        {p && (
          <>
            <section className="tp-section" aria-labelledby="tp-about"><h2 id="tp-about" className="tp-h">{fr ? 'À propos' : 'About'}</h2><p className="tp-p">{l(p.about)}</p></section>
            <section className="tp-section" aria-labelledby="tp-approach">
              <h2 id="tp-approach" className="tp-h">{fr ? 'Ma façon d’enseigner' : 'How I teach'}</h2>
              <ul className="tp-list">{p.approach.map((a) => <li key={a.en}><Icon name="checkCircle" size={16} /> {l(a)}</li>)}</ul>
            </section>
            <section className="tp-section" aria-labelledby="tp-skills">
              <h2 id="tp-skills" className="tp-h">{fr ? 'Spécialités' : 'Specialities'}</h2>
              <ul className="tp-skills">
                {Object.entries(p.endorsements).sort((a, b) => b[1] - a[1]).map(([s, n]) => (
                  <li key={s}>
                    <div className="row between"><strong>{s}</strong><span className="tiny muted">{fr ? `Recommandé par ${n} apprenants` : `Endorsed by ${n} learners`}</span></div>
                    <span className="tp-bar"><span style={{ width: `${(n / maxEndorse) * 100}%` }} /></span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="tp-section" aria-labelledby="tp-exp">
              <h2 id="tp-exp" className="tp-h">{fr ? 'Expérience' : 'Experience'}</h2>
              <ol className="tp-timeline">
                {p.experience.map((e) => (
                  <li key={e.org + e.from}>
                    <span className="tp-org-mark" aria-hidden>{e.org.slice(0, 1)}</span>
                    <div>
                      <strong>{l(e.role)}</strong>
                      <div className="small">{e.org} · {e.place}</div>
                      <div className="tiny muted">{e.from} – {e.to ?? (fr ? 'aujourd’hui' : 'present')}</div>
                      <p className="small" style={{ marginTop: 4 }}>{l(e.text)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
            <section className="tp-section tp-two" aria-label={fr ? 'Formation et langues' : 'Education and languages'}>
              <div>
                <h2 className="tp-h">{fr ? 'Formation et certifications' : 'Education & certifications'}</h2>
                <ul className="tp-plain">
                  {p.education.map((e) => <li key={e.org}><Icon name="book" size={15} /> <span><strong>{l(e.title)}</strong><br /><span className="small muted">{e.org} · {e.year}</span></span></li>)}
                  {p.certifications.map((c) => <li key={c.name}><Icon name="award" size={15} /> <span><strong>{c.name}</strong><br /><span className="small muted">{c.issuer} · {c.year}</span></span></li>)}
                </ul>
              </div>
              <div>
                <h2 className="tp-h">{fr ? 'Langues' : 'Languages'}</h2>
                <ul className="tp-plain">{p.languages.map((x) => <li key={x.name}><Icon name="globe" size={15} /> <span><strong>{x.name}</strong> <span className="small muted">· {PROF[x.level][fr ? 'fr' : 'en']}</span></span></li>)}</ul>
              </div>
            </section>
          </>
        )}

        {courses.length > 0 && (
          <section className="tp-section" aria-labelledby="tp-courses">
            <h2 id="tp-courses" className="tp-h">{fr ? 'Cours enseignés' : 'Courses taught'}</h2>
            <div className="tp-courses">{courses.map((c) => <Link key={c.id} to={`/app/courses/${c.id}`} className="tp-course"><Icon name="book" size={16} /><span><strong>{l(c.title)}</strong><br /><span className="tiny muted">{c.levels}</span></span></Link>)}</div>
          </section>
        )}

        <section className="tp-section" aria-labelledby="tp-avail">
          <div className="row between"><h2 id="tp-avail" className="tp-h">{fr ? 'Disponibilités habituelles' : 'Usual availability'}</h2><Link to={`/app/book?tutor=${t.id}`} className="link small">{fr ? 'Voir les créneaux et réserver' : 'See times and book'} →</Link></div>
          <div className="tp-avail">{Object.entries(t.availability).filter(([, h]) => h.length).map(([d, h]) => <div key={d}><strong>{days[Number(d)]}</strong><span>{h.join(' · ')}</span></div>)}</div>
        </section>

        {p && p.reviews.length > 0 && (
          <section className="tp-section" aria-labelledby="tp-reviews">
            <h2 id="tp-reviews" className="tp-h">{fr ? 'Avis des apprenants' : 'What learners say'} <span className="tiny muted">· {t.rating} ★ ({t.reviews})</span></h2>
            <div className="tp-reviews">
              {p.reviews.map((r) => (
                <figure key={r.by + r.date} className="tp-review">
                  <Stars value={r.rating} />
                  <blockquote>“{l(r.text)}”</blockquote>
                  <figcaption className="tiny muted">{r.by} · {r.level} · {formatDate(r.date, lang, { month: 'long', year: 'numeric' })}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}
        <p className="tiny muted" style={{ textAlign: 'center' }}>{fr ? 'Pour votre sécurité, les coordonnées personnelles ne sont jamais affichées : réservez et échangez via La Porte.' : 'For everyone’s safety, personal contact details are never shown: book and message through La Porte.'}</p>
      </div>

      {/* Side column: other tutors */}
      <aside className="tp-side" aria-label={fr ? 'Autres tuteurs' : 'Other tutors'}>
        <section className="tp-section">
          <h2 className="tp-h">{fr ? 'Autres tuteurs' : 'Other tutors'}</h2>
          <ul className="tp-others">
            {others.map((o) => (
              <li key={o.id}>
                <Link to={`/app/tutors/${o.id}`} className="tp-other">
                  <Avatar spec={o.portrait} size={44} />
                  <span style={{ minWidth: 0 }}><strong>{o.name}</strong><span className="tiny muted" style={{ display: 'block' }}>{TUTOR_PROFILES[o.id] ? l(TUTOR_PROFILES[o.id].headline) : l(o.title)}</span></span>
                </Link>
              </li>
            ))}
          </ul>
          <Link to="/app/tutors" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}>{fr ? 'Tous les tuteurs' : 'All tutors'}</Link>
        </section>
      </aside>
    </div>
  );
}
