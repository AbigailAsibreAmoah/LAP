import { COURSES, LEVEL_ORDER, TUTORS, TUTOR_PROFILES, type CefrLevel, type Proficiency, type Tutor } from '@laporte/shared';
import { useEffect, useMemo, useState } from 'react';
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
      <PageHead title={fr ? 'Nos tuteurs' : 'Our tutors'} sub={fr ? 'Découvrez le parcours, les spécialités et les cours de chaque tuteur.' : 'Look up each tutor’s background, expertise and the courses they teach.'} />
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
              <Link key={t.id} to={`/app/tutors/${t.id}`} className="tp-card" aria-label={`${t.name} — ${fr ? 'voir le profil' : 'view profile'}`}>
                <div className="tp-card-cover" aria-hidden />
                <Avatar spec={t.portrait} size={76} />
                <h2 className="tp-card-name">{t.name}</h2>
                <p className="tp-card-headline">{p ? l(p.headline) : l(t.title)}</p>
                <p className="tiny muted">{p?.location ?? ''} · {t.levels}</p>
                <p className="tp-card-rating"><Stars value={t.rating} /> {t.rating} <span className="muted">({t.reviews})</span></p>
                <div className="tp-chips">{t.specialities.slice(0, 3).map((s) => <span key={s} className="chip chip-outline">{s}</span>)}</div>
                <span className="tp-card-cta">{fr ? 'Voir le profil' : 'View profile'} →</span>
              </Link>
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

const PROF_DOTS: Record<Proficiency, number> = { native: 5, fluent: 4, professional: 4, conversational: 2 };
const SECTIONS = [
  { id: 'about', en: 'About', fr: 'À propos' },
  { id: 'expertise', en: 'Expertise', fr: 'Expertise' },
  { id: 'experience', en: 'Experience', fr: 'Parcours' },
  { id: 'courses', en: 'Courses', fr: 'Cours' },
  { id: 'reviews', en: 'Reviews', fr: 'Avis' },
] as const;

/** Highlights the section tab of whatever part of the profile is on screen. */
function useActiveSection(ids: readonly string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => {
      const seen = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (seen) setActive(seen.target.id.replace('tp-', ''));
    }, { rootMargin: '-120px 0px -55% 0px' });
    ids.forEach((id) => { const el = document.getElementById(`tp-${id}`); if (el) io.observe(el); });
    return () => io.disconnect();
  }, [ids]);
  return active;
}

export function TutorProfilePage() {
  const { id } = useParams();
  const { l, lang } = useI18n();
  const fr = lang === 'fr';
  const { learner, threads, userId } = useStore();
  const t = TUTORS.find((x) => x.id === id);
  const active = useActiveSection(SECTIONS.map((s) => s.id));
  if (!t) return <div className="card"><EmptyState icon="user" title={fr ? 'Tuteur introuvable' : 'Tutor not found'} /><p style={{ textAlign: 'center' }}><Link to="/app/tutors" className="link">{fr ? 'Voir tous les tuteurs' : 'See all tutors'}</Link></p></div>;
  const p = TUTOR_PROFILES[t.id];
  const fits = teachesLevel(t, learner.level);
  const thread = threads.find((th) => th.participantIds.includes(userId) && th.participantIds.includes(t.id));
  const courses = COURSES.filter((c) => c.tutorId === t.id);
  const others = TUTORS.filter((x) => x.id !== t.id);
  const first = t.name.split(' ')[0];
  const jump = (sid: string) => document.getElementById(`tp-${sid}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const bookCard = (
    <section className="tp-book" aria-label={fr ? `Séances avec ${first}` : `Sessions with ${first}`}>
      <h2 className="tp-book-title">{fr ? `Séances privées avec ${first}` : `Private sessions with ${first}`}</h2>
      <ul className="tp-book-facts">
        <li><Icon name="checkCircle" size={16} /> {fr ? 'Votre première conversation est offerte' : 'Your first conversation is free'}</li>
        <li><Icon name="card" size={16} /> {fr ? 'Ensuite, 1 crédit de séance' : 'Then 1 session credit per session'}</li>
        <li><Icon name="meet" size={16} /> {fr ? 'En ligne sur Google Meet' : 'Online on Google Meet'}</li>
        <li><Icon name="award" size={16} /> {fr ? `Niveaux ${t.levels}` : `Levels ${t.levels}`}{fits && <span className="tp-fit">{fr ? 'votre niveau' : 'your level'}</span>}</li>
      </ul>
      <Link to={`/app/book?tutor=${t.id}`} className="btn btn-primary tp-book-btn"><Icon name="calendar" size={16} /> {fr ? 'Réserver une séance' : 'Book a session'}</Link>
      {thread ? <Link to={`/app/messages?thread=${thread.id}`} className="btn btn-secondary tp-book-btn"><Icon name="message" size={16} /> {fr ? `Écrire à ${first}` : `Message ${first}`}</Link> : <p className="tiny muted" style={{ margin: 0, textAlign: 'center' }}>{fr ? 'La messagerie s’ouvre après votre première séance.' : 'Messaging opens after your first session.'}</p>}
    </section>
  );

  return (
    <div className="tp-page">
      {/* ---------- Header ---------- */}
      <header className="tp-hero">
        <div className="tp-hero-cover" aria-hidden><span /><span /><span /></div>
        <div className="tp-hero-body">
          <span className="tp-hero-avatar"><Avatar spec={t.portrait} size={136} expression="joy" /></span>
          <div className="tp-hero-text">
            <div className="tp-hero-name-row">
              <h1 className="tp-hero-name">{t.name}</h1>
              <span className="tp-verified" title={fr ? 'Tuteur certifié La Porte' : 'Certified La Porte tutor'}><Icon name="check" size={12} stroke={3} /> {fr ? 'Tuteur La Porte' : 'La Porte tutor'}</span>
            </div>
            <p className="tp-hero-headline">{p ? l(p.headline) : l(t.title)}</p>
            <div className="tp-hero-chips">
              {p && <span><Icon name="globe" size={14} /> {p.location}</span>}
              <span className="tp-hero-rating"><b>★ {t.rating}</b> · {t.reviews} {fr ? 'avis' : 'reviews'}</span>
              {p && <span>{fr ? `Chez La Porte depuis ${p.since}` : `With La Porte since ${p.since}`}</span>}
              {p && <span>{fr ? 'Accent :' : 'Accent:'} {l(p.accent)}</span>}
            </div>
          </div>
        </div>
        {p && (
          <dl className="tp-facts">
            <div><dt>{fr ? 'ans d’enseignement' : 'years teaching'}</dt><dd>{p.yearsTeaching}</dd></div>
            <div><dt>{fr ? 'apprenants' : 'learners'}</dt><dd>{p.learnersTaught}</dd></div>
            <div><dt>{fr ? 'séances' : 'sessions'}</dt><dd>{p.sessionsLed.toLocaleString(fr ? 'fr-FR' : 'en-GB')}</dd></div>
            <div><dt>{fr ? 'niveaux' : 'levels'}</dt><dd>{t.levels}</dd></div>
          </dl>
        )}
      </header>

      {/* ---------- Section tabs ---------- */}
      <nav className="tp-tabs" aria-label={fr ? 'Sections du profil' : 'Profile sections'}>
        {SECTIONS.filter((s) => s.id !== 'courses' || courses.length).map((s) => (
          <button key={s.id} type="button" className="tp-tab" aria-current={active === s.id ? 'true' : undefined} onClick={() => jump(s.id)}>{s[fr ? 'fr' : 'en']}</button>
        ))}
      </nav>

      <div className="tp-columns">
        <div className="tp-col-main">
          <div className="tp-book-mobile">{bookCard}</div>

          {p && (
            <section id="tp-about" className="tp-panel" aria-labelledby="tp-about-h">
              <h2 id="tp-about-h" className="tp-panel-h">{fr ? 'À propos' : 'About'}</h2>
              <p className="tp-about">{l(p.about)}</p>
              <h3 className="tp-sub">{fr ? 'Ma façon d’enseigner' : 'How I teach'}</h3>
              <ol className="tp-approach">
                {p.approach.map((a, i) => <li key={a.en}><span className="tp-num">{i + 1}</span><span>{l(a)}</span></li>)}
              </ol>
            </section>
          )}

          {p && (
            <section id="tp-expertise" className="tp-panel" aria-labelledby="tp-expertise-h">
              <h2 id="tp-expertise-h" className="tp-panel-h">{fr ? 'Expertise' : 'Expertise'}</h2>
              <div className="tp-endorse">
                {Object.entries(p.endorsements).sort((a, b) => b[1] - a[1]).map(([s, n]) => (
                  <span key={s} className="tp-skill"><strong>{s}</strong><span className="tp-skill-n" title={fr ? `Recommandé par ${n} apprenants` : `Endorsed by ${n} learners`}>{n}</span></span>
                ))}
              </div>
              <p className="tiny muted" style={{ margin: '8px 0 0' }}>{fr ? 'Les chiffres indiquent combien d’apprenants recommandent cette compétence.' : 'Numbers show how many learners endorsed each skill.'}</p>
              <h3 className="tp-sub">{fr ? 'Langues' : 'Languages'}</h3>
              <ul className="tp-langs">
                {p.languages.map((x) => (
                  <li key={x.name}>
                    <strong>{x.name}</strong>
                    <span className="tp-dots" aria-label={PROF[x.level][fr ? 'fr' : 'en']}>{Array.from({ length: 5 }, (_, k) => <i key={k} data-on={k < PROF_DOTS[x.level] || undefined} />)}</span>
                    <span className="tiny muted">{PROF[x.level][fr ? 'fr' : 'en']}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {p && (
            <section id="tp-experience" className="tp-panel" aria-labelledby="tp-experience-h">
              <h2 id="tp-experience-h" className="tp-panel-h">{fr ? 'Parcours' : 'Experience'}</h2>
              <ol className="tp-tl">
                {p.experience.map((e) => (
                  <li key={e.org + e.from} data-now={!e.to || undefined}>
                    <span className="tp-tl-dot" aria-hidden />
                    <div className="tp-tl-when">{e.from} – {e.to ?? (fr ? 'aujourd’hui' : 'present')}</div>
                    <strong className="tp-tl-role">{l(e.role)}</strong>
                    <div className="tp-tl-org">{e.org} · {e.place}</div>
                    <p className="tp-tl-text">{l(e.text)}</p>
                  </li>
                ))}
              </ol>
              <div className="tp-creds">
                {p.education.map((e) => (
                  <div key={e.org} className="tp-cred"><span className="tp-cred-icon"><Icon name="book" size={16} /></span><div><span className="tp-cred-kind">{fr ? 'Formation' : 'Education'}</span><strong>{l(e.title)}</strong><span className="tiny muted">{e.org} · {e.year}</span></div></div>
                ))}
                {p.certifications.map((c) => (
                  <div key={c.name} className="tp-cred"><span className="tp-cred-icon tp-cred-gold"><Icon name="award" size={16} /></span><div><span className="tp-cred-kind">{fr ? 'Certification' : 'Certification'}</span><strong>{c.name}</strong><span className="tiny muted">{c.issuer} · {c.year}</span></div></div>
                ))}
              </div>
            </section>
          )}

          {courses.length > 0 && (
            <section id="tp-courses" className="tp-panel" aria-labelledby="tp-courses-h">
              <h2 id="tp-courses-h" className="tp-panel-h">{fr ? `Cours enseignés par ${first}` : `Courses ${first} teaches`}</h2>
              <div className="tp-course-grid">
                {courses.map((c, i) => (
                  <Link key={c.id} to={`/app/courses/${c.id}`} className="tp-course-tile" data-tone={i % 3}>
                    <span className="tp-course-band" aria-hidden><Icon name="book" size={18} /></span>
                    <span className="tp-course-body"><strong>{l(c.title)}</strong><span className="chip">{c.levels}</span><span className="tp-course-link">{fr ? 'Voir le cours' : 'View course'} →</span></span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {p && (
            <section id="tp-reviews" className="tp-panel" aria-labelledby="tp-reviews-h">
              <h2 id="tp-reviews-h" className="tp-panel-h">{fr ? 'Avis des apprenants' : 'What learners say'}</h2>
              <div className="tp-reviews-wrap">
                <div className="tp-score">
                  <span className="tp-score-n">{t.rating.toFixed(1)}</span>
                  <Stars value={t.rating} />
                  <span className="tiny muted">{t.reviews} {fr ? 'avis d’apprenants' : 'learner reviews'}</span>
                </div>
                <div className="tp-review-list">
                  {p.reviews.map((r) => (
                    <figure key={r.by + r.date} className="tp-quote">
                      <blockquote>{l(r.text)}</blockquote>
                      <figcaption>
                        <span className="tp-quote-avatar" aria-hidden>{r.by.slice(0, 1)}</span>
                        <span><strong>{r.by}</strong><span className="tiny muted" style={{ display: 'block' }}>{r.level} · {formatDate(r.date, lang, { month: 'long', year: 'numeric' })}</span></span>
                        <Stars value={r.rating} />
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            </section>
          )}
          <p className="tp-safety"><Icon name="lock" size={14} /> {fr ? 'Pour la sécurité de tous, les coordonnées personnelles ne sont jamais affichées : réservez et échangez via La Porte.' : 'For everyone’s safety, personal contact details are never shown: book and message through La Porte.'}</p>
        </div>

        <aside className="tp-col-side">
          <div className="tp-book-desktop">{bookCard}</div>
          <section className="tp-panel tp-others-panel" aria-label={fr ? 'Autres tuteurs' : 'Other tutors'}>
            <h2 className="tp-panel-h tp-panel-h-sm">{fr ? 'Autres tuteurs' : 'Other tutors'}</h2>
            <ul className="tp-others">
              {others.map((o) => (
                <li key={o.id}>
                  <Link to={`/app/tutors/${o.id}`} className="tp-other">
                    <Avatar spec={o.portrait} size={44} />
                    <span style={{ minWidth: 0 }}><strong>{o.name}</strong><span className="tiny muted">{o.specialities.slice(0, 2).join(' · ')} · ★ {o.rating}</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
