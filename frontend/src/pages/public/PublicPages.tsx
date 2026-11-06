import { ADDITIONAL_PACKAGES, COURSE_AREAS, COURSES, courseOutline, MEMBERSHIP_PLANS, PATHWAYS, TUTORS, type CefrLevel, type Course, type CourseAreaId, type Tutor, canStudy, courseOpen, courseRange } from '@laporte/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Avatar, Portrait } from '../../components/3d/Portrait';
import { Reveal, StaggerGroup } from '../../components/animations/Reveal';
import { ease, fadeUp, spring } from '../../components/animations/motion';
import { DemoTag, EmptyState, Hint, Notice } from '../../components/ui/Controls';
import { Icon } from '../../components/ui/Icon';
import { START_PENDING_KEY } from '../onboarding/StartPage';
import { writeLocal } from '../../utils/storage';
import { LevelAccessBanner, LockedLevel } from '../../features/access/LevelAccess';
import { useToast } from '../../components/ui/Toasts';
import { ACCENT_BG, AreaEmblem, CourseCard } from '../../features/courses/CourseCard';
import { useI18n } from '../../i18n/I18nProvider';
import { useStore } from '../../state/AppStore';
import { formatClip, formatGhs } from '../../utils/format';
import { HowSteps } from './HomePage';

export function PageHero({ eyebrow, title, sub, children }: { eyebrow?: string; title: string; sub?: string; children?: ReactNode }) {
  return (
    <section className="page-hero">
      <div className="container" style={{ paddingBlock: 'clamp(44px, 6vw, 80px)' }}>
        <Reveal className="section-head flush" as="div">
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h1 style={{ fontSize: 'clamp(2.2rem, 4.4vw, 3.5rem)' }}>{title}</h1>
          {sub && <p className="lede">{sub}</p>}
          {children}
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Courses ---------- */

export function CoursesPage({ inApp }: { inApp?: boolean }) {
  const { t, l } = useI18n();
  const { lang } = useI18n();
  const [params, setParams] = useSearchParams();
  const area = (params.get('area') as CourseAreaId | null) ?? 'all';
  const level = params.get('level') as CefrLevel | null;
  const { learner, content: library } = useStore();
  // A course is open in the app when it has lessons at the learner's own level(s).
  const hasOpenLessons = (c: (typeof COURSES)[number]) => {
    const lessons = library.lessons.filter((x) => x.courseId === c.id && x.status !== 'archived');
    return lessons.length ? lessons.some((x) => canStudy(learner, x.level)) : courseOpen(learner, c);
  };
  const filtered = COURSES.filter((c) => (area === 'all' || c.area === area) && (!level || coversLevel(c, level)));
  // In the app, My Courses shows the courses at the learner's level; harder ones are listed as locked.
  // My Courses shows only the courses at the learner's level; the rest open when they move up.
  const list = inApp ? filtered.filter(hasOpenLessons) : filtered;
  const above = inApp ? filtered.filter((c) => !hasOpenLessons(c)) : [];
  const base = inApp ? '/app/courses' : '/courses';
  const setFilter = (key: 'area' | 'level', value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const body = (
    <>
      <div className="stack" style={{ ['--gap' as string]: '12px', marginBottom: 36 }}>
        <div className="row between">
          <h2 className="h3">{t('courses.pathways')}</h2>
          <span className="tiny muted">{lang === 'fr' ? 'Choisissez un niveau pour filtrer' : 'Pick a level to filter'}</span>
        </div>
        <div className="level-ladder" role="group" aria-label={t('courses.pathways')}>
          {PATHWAYS.map((p, i) => (
            <button key={p.level} type="button" className="ladder-step" style={{ ['--step' as string]: i }} aria-pressed={level === p.level} onClick={() => setFilter('level', level === p.level ? null : p.level)}>
              <span className="ladder-level">{p.level}</span>
              <span className="ladder-name">{l(p.name)}</span>
              <span className="ladder-can small">{l(p.canDo)}</span>
              <span className="tiny muted num">~{p.weeks} {t('courses.weeks')}</span>
            </button>
          ))}
        </div>
        <p className="tiny muted">{t('courses.future')}</p>
      </div>

      <div className="filter-row" role="group" aria-label={t('common.filter')}>
        {[{ id: 'all', label: t('courses.all') }, ...COURSE_AREAS.map((a) => ({ id: a.id, label: l(a.name) }))].map((f) => (
          <button
            key={f.id}
            className={`chip ${area === f.id ? 'chip-navy' : 'chip-outline'}`}
            style={{ cursor: 'pointer', minHeight: 34, padding: '0 14px' }}
            aria-pressed={area === f.id}
            onClick={() => setFilter('area', f.id === 'all' ? null : f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <p className="small muted" role="status" style={{ marginBottom: 16 }}>
        {lang === 'fr' ? `${list.length} cours` : `${list.length} course${list.length === 1 ? '' : 's'}`}
        {level && ` · ${level}`}
        {(level || area !== 'all') && (
          <button className="link small" style={{ marginLeft: 10 }} onClick={() => setParams({}, { replace: true })}>
            {lang === 'fr' ? 'Effacer les filtres' : 'Clear filters'}
          </button>
        )}
      </p>
      {list.length || above.length ? (
        <>
          {list.length > 0 && (
            <StaggerGroup className="grid grid-3" key={`${area}-${level}`}>
              {list.map((c) => (
                <CourseCard key={c.id} course={c} to={`${base}/${c.id}`} />
              ))}
            </StaggerGroup>
          )}
          {above.length > 0 && (
            <p className="small muted level-more" style={{ marginTop: 24 }}>
              <Icon name="lock" size={14} /> {lang === 'fr' ? `${above.length} autre(s) cours s’ouvriront à d’autres niveaux. Vous voyez uniquement le contenu de votre niveau.` : `${above.length} more course${above.length === 1 ? '' : 's'} open at other levels. You only see the content for your level.`}
            </p>
          )}
        </>
      ) : (
        <EmptyState title={t('courses.none')}>
          {lang === 'fr' ? 'Essayez un autre niveau ou un autre domaine.' : 'Try another level or area.'}
        </EmptyState>
      )}
    </>
  );

  if (inApp)
    return (
      <>
        <div className="page-head">
          <div>
            <h1>{t('app.courses')}</h1>
            <p className="muted">{t('courses.sub')}</p>
          </div>
          <Link to="/app/placement" className="btn btn-secondary btn-sm"><Icon name="award" size={15} /> {t('cta.findLevel')}</Link>
        </div>
        <div style={{ marginBottom: 24 }}><LevelAccessBanner /></div>
        {body}
      </>
    );

  return (
    <>
      <PageHero eyebrow={t('nav.courses')} title={t('courses.title')} sub={t('courses.sub')}>
        <div className="row" style={{ ['--gap' as string]: '10px', marginTop: 18 }}>
          <Link to="/register?next=placement" className="btn btn-primary"><Icon name="award" size={17} /> {t('cta.findLevel')}</Link>
          <span className="small muted">{t('cta.findLevelSub')} · A1–C2</span>
        </div>
      </PageHero>
      <section className="section" style={{ paddingTop: 48 }}>
        <div className="container">{body}</div>
      </section>
    </>
  );
}

export function CourseDetailPage({ inApp }: { inApp?: boolean }) {
  const { id } = useParams();
  const { t, l, lang } = useI18n();
  const { plan, content: library, learner } = useStore();
  const course = COURSES.find((c) => c.id === id);
  const [openModule, setOpenModule] = useState<number | null>(null);
  if (!course) return <EmptyState title="Course not found" />;
  const tutor = TUTORS.find((tu) => tu.id === course.tutorId)!;
  const area = COURSE_AREAS.find((a) => a.id === course.area)!;
  // Published lessons come from the content library; catalogue lessons not yet published show as coming soon.
  const outline = courseOutline(library, course.id).map((m, i) => {
    const known = new Set(m.lessons.map((x) => x.id));
    const pending = course.modules[i].lessons.filter((x) => !known.has(x.id)).map((x) => ({ ...x, level: courseRange(course)[0], status: 'draft' as const, available: false }));
    // Keep the catalogue's order, so the end-of-level assessment stays the last lesson.
    const order = course.modules[i].lessons.map((x) => x.id);
    const at = (id: string) => { const n = order.indexOf(id); return n < 0 ? order.length : n; };
    const lessons = [...m.lessons, ...pending].sort((a, b) => Number(a.kind === 'assessment') - Number(b.kind === 'assessment') || at(a.id) - at(b.id));
    return { title: m.title, lessons };
  });
  const published = outline.flatMap((m) => m.lessons).filter((x) => x.available);
  const done = new Set(library.completions.filter((x) => x.learnerId === learner.id).map((x) => x.lessonId));
  const previewId = published[0]?.id ?? course.modules[0].lessons[0].id;
  // Open the first module that has something to learn now.
  const shown = openModule ?? Math.max(0, outline.findIndex((m) => m.lessons.some((x) => x.available)));
  const hasAccess = !course.premium || plan !== 'plan-essentials';

  const content = (
    <div className="detail-grid">
      <div className="stack" style={{ ['--gap' as string]: '28px', minWidth: 0 }}>
        <section className="card">
          <h2 className="h3" style={{ marginBottom: 14 }}>{t('courses.outcomes')}</h2>
          <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: 0, ['--gap' as string]: '10px' }}>
            {course.outcomes.map((o) => (
              <li key={o.en} className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--green)', marginTop: 2 }}><Icon name="checkCircle" size={18} /></span>
                <span>{l(o)}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h2 className="h3" style={{ marginBottom: 10 }}>{t('courses.curriculum')}</h2>
          <p className="tiny muted" style={{ marginTop: -4, marginBottom: 6 }}>{published.length}/{outline.reduce((n, m) => n + m.lessons.length, 0)} {lang === 'fr' ? 'leçons disponibles · les autres arrivent progressivement' : 'lessons available · more are released progressively'}</p>
          {outline.map((m, i) => (
            <div key={m.title.en} style={{ borderBottom: i < outline.length - 1 ? '1px solid var(--line)' : 0 }}>
              <button className="row between" style={{ width: '100%', background: 'none', border: 0, padding: '14px 0', cursor: 'pointer', textAlign: 'left' }} aria-expanded={shown === i} onClick={() => setOpenModule(shown === i ? -1 : i)}>
                <span>
                  <span className="tiny muted" style={{ fontWeight: 700 }}>Module {i + 1}</span>
                  <span style={{ display: 'block', fontWeight: 700, color: 'var(--navy)' }}>{l(m.title)}</span>
                </span>
                <motion.span animate={{ rotate: shown === i ? 180 : 0 }}><Icon name="chevronDown" size={18} /></motion.span>
              </button>
              <AnimatePresence initial={false}>
                {shown === i && (
                  <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: ease.out }} style={{ listStyle: 'none', margin: 0, padding: '0 0 12px', overflow: 'hidden' }}>
                    {m.lessons.map((les) => (
                      <li key={les.id} className="list-row" data-pending={!les.available || undefined}>
                        <span style={{ color: 'var(--gold-600)' }}><Icon name={les.kind === 'assessment' ? 'award' : les.kind === 'live' ? 'meet' : les.kind === 'speaking' ? 'mic' : les.kind === 'quiz' ? 'quiz' : les.kind === 'assignment' ? 'edit' : les.kind === 'reading' ? 'book' : 'video'} size={18} /></span>
                        <span lang="fr" style={{ flex: 1 }}>{les.title}</span>
                        {!les.available ? (
                          <span className="chip" style={{ minHeight: 22 }}>{lang === 'fr' ? 'Bientôt' : 'Coming soon'}</span>
                        ) : (
                          <span className="tiny muted">{les.videoSec ? `${formatClip(les.videoSec)} video · ` : ''}{les.minutes} {t('common.min')}</span>
                        )}
                        {done.has(les.id) && <span style={{ color: 'var(--green)' }} title={lang === 'fr' ? 'Terminée' : 'Completed'}><Icon name="checkCircle" size={16} /></span>}
                        {inApp && les.available && !canStudy(learner, les.level) && <LockedLevel level={les.level} />}
                        {inApp && les.available && (
                          <Link to={`/app/learn/${les.id}?course=${course.id}`} className="icon-btn" style={{ width: 32, height: 32 }} aria-label={les.title}>
                            <Icon name={hasAccess && canStudy(learner, les.level) ? 'play' : 'lock'} size={14} />
                          </Link>
                        )}
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          ))}
        </section>
      </div>
      <div className="stack" style={{ ['--gap' as string]: '16px' }}>
        <div className="card stack" style={{ ['--gap' as string]: '12px' }}>
          {[
            [t('courses.level'), course.levels],
            [t('courses.duration'), `${course.durationWeeks} ${t('courses.weeks')}`],
            [t('courses.format'), l(course.format)],
            [t('courses.lessons'), `${course.modules.reduce((n, m) => n + m.lessons.length, 0)} · ${Math.round(course.modules.reduce((n, m) => n + m.lessons.reduce((a, x) => a + x.minutes, 0), 0) / 6) / 10} h`],
          ].map(([k, v]) => (
            <div key={k} className="row between small" style={{ flexWrap: 'nowrap' }}>
              <span className="muted">{k}</span>
              <span style={{ fontWeight: 600, textAlign: 'right' }}>{v}</span>
            </div>
          ))}
          <hr className="divider" />
          <Link to={inApp ? `/app/learn/${previewId}?course=${course.id}` : '/register'} className="btn btn-primary btn-block">
            {inApp ? t('dash.continue') : t('courses.enrol')}
          </Link>
          <Link to={inApp ? `/app/learn/${previewId}?course=${course.id}&preview=1` : `/app/learn/${previewId}?course=${course.id}&preview=1`} className="btn btn-secondary btn-block">
            <Icon name="play" size={14} /> {t('courses.preview')}
          </Link>
          {course.premium && <p className="tiny muted">{t('pricing.sub')}</p>}
        </div>
        <div className="card">
          <div className="tiny muted" style={{ fontWeight: 700, marginBottom: 10 }}>{t('courses.tutor')}</div>
          <div className="row">
            <Avatar spec={tutor.portrait} size={48} />
            <div>
              <div style={{ fontWeight: 700 }}>{tutor.name}</div>
              <div className="tiny muted">{l(tutor.title)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const header = (
    <div className="row" style={{ ['--gap' as string]: '22px', flexWrap: 'nowrap', alignItems: 'center' }}>
      <span className="hide-sm"><AreaEmblem area={course.area} accent={course.accent} size={72} /></span>
      <div className="stack" style={{ ['--gap' as string]: '8px' }}>
        <span className="eyebrow" style={{ color: '#E7C78F' }}>{l(area.name)}</span>
        <h1 style={{ color: '#fff', fontSize: 'clamp(2rem, 4vw, 3rem)' }}>{l(course.title)}</h1>
        <p style={{ color: 'rgba(255,255,255,.82)', maxWidth: 620 }}>{l(course.summary)}</p>
      </div>
    </div>
  );

  return inApp ? (
    <>
      <Link to="/app/courses" className="link small" style={{ marginBottom: 14 }}><Icon name="arrowLeft" size={15} /> {t('app.courses')}</Link>
      <div className="card" style={{ background: ACCENT_BG[course.accent], border: 0, ['--pad' as string]: '28px', marginBottom: 24 }}>{header}</div>
      {content}
    </>
  ) : (
    <>
      <section style={{ background: ACCENT_BG[course.accent] }}>
        <div className="container" style={{ paddingBlock: 'clamp(48px, 7vw, 80px)' }}>
          <Link to="/courses" className="link small" style={{ color: '#E7C78F', marginBottom: 18 }}><Icon name="arrowLeft" size={15} /> {t('nav.courses')}</Link>
          {header}
        </div>
      </section>
      <section className="section" style={{ paddingTop: 40 }}>
        <div className="container">{content}</div>
      </section>
    </>
  );
}

/* ---------- Tutors ---------- */

export function TutorsPage() {
  const { t, l, lang } = useI18n();
  return (
    <>
      <PageHero eyebrow={t('nav.tutors')} title={t('tutors.title')} sub={t('tutors.sub')}>
        <Notice>{t('tutors.demoProfiles')}</Notice>
      </PageHero>
      <section className="section" style={{ paddingTop: 48 }}>
        <StaggerGroup className="container grid tutor-grid">
          {TUTORS.map((tu) => (
            <motion.div key={tu.id} variants={fadeUp}>
              <article className="card tutor-card">
                <div className="tutor-portrait" style={{ background: tu.portrait.bg }}>
                  <Portrait spec={tu.portrait} expression="smile" framed={false} />
                </div>
                <div className="stack" style={{ padding: 22, ['--gap' as string]: '10px' }}>
                  <div>
                    <h2 className="h3" style={{ fontSize: '1.25rem' }}>{tu.name}</h2>
                    <div className="small muted">{l(tu.title)}</div>
                  </div>
                  <div className="row tiny" style={{ ['--gap' as string]: '6px' }}>
                    <span style={{ color: 'var(--gold-600)' }}><Icon name="star" size={14} /></span>
                    <strong>{tu.rating}</strong> <span className="muted">({tu.reviews} {t('tutors.reviews')})</span> <DemoTag />
                  </div>
                  <p className="small" style={{ color: 'var(--ink-2)' }}>{l(tu.bio)}</p>
                  <div className="row" style={{ ['--gap' as string]: '6px' }}>
                    {tu.specialities.map((s) => (
                      <span key={s} className="chip">{s}</span>
                    ))}
                  </div>
                  <dl className="tutor-facts tiny">
                    <div><dt>{t('tutors.speaks')}</dt><dd>{tu.languages.join(', ')}</dd></div>
                    <div><dt>{t('courses.level')}</dt><dd>{tu.levels}</dd></div>
                    <div><dt>{lang === 'fr' ? 'Enseigne le' : 'Teaches on'}</dt><dd>{teachingDays(tu, lang)}</dd></div>
                  </dl>
                  <Link to={`/app/book?tutor=${tu.id}`} className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start', marginTop: 'auto' }}>
                    {t('tutors.book')} <span className="sr-only">— {tu.name}</span>
                  </Link>
                </div>
              </article>
            </motion.div>
          ))}
        </StaggerGroup>
      </section>
    </>
  );
}

/* ---------- How it works ---------- */

export function HowItWorksPage() {
  const { t, lang } = useI18n();
  const blocks = lang === 'fr'
    ? [
        ['Apprentissage en autonomie', 'Vidéos, lectures, quiz et devoirs écrits organisés en parcours A1–C2.'],
        ['Classes en direct', 'Classes en groupe et séances privées sur Google Meet, réservées depuis votre espace.'],
        ['Speaking Studio', 'Scénarios réalistes pour s’entraîner à parler, avec expressions utiles et retours.'],
        ['Suivi et retours', 'Vos tuteurs commentent vos devoirs et enregistrent vos progrès dans votre passeport.'],
      ]
    : [
        ['Self-paced learning', 'Videos, readings, quizzes and written assignments organised into A1–C2 pathways.'],
        ['Live classes', 'Group classes and private sessions on Google Meet, booked from your workspace.'],
        ['Speaking Studio', 'Realistic scenarios to practise speaking, with useful phrases and feedback.'],
        ['Feedback & tracking', 'Tutors review your work and record progress in your Performance Passport.'],
      ];
  return (
    <>
      <PageHero eyebrow={t('nav.how')} title={t('home.howTitle')} sub={t('brand.promise')} />
      <section className="section">
        <div className="container stack" style={{ ['--gap' as string]: '64px' }}>
          <h2 className="sr-only">{t('home.howEyebrow')}</h2>
          <HowSteps />
          <div className="grid grid-2">
            {blocks.map(([title, body], i) => (
              <Reveal key={title} delay={i * 0.05} className="card card-ivory" as="div">
                <h2 className="h3" style={{ fontSize: '1.2rem' }}>{title}</h2>
                <p className="muted" style={{ marginTop: 8 }}>{body}</p>
              </Reveal>
            ))}
          </div>
          <Notice tone="navy">{t('demo.teams')}</Notice>
        </div>
      </section>
    </>
  );
}

/* ---------- Pricing ---------- */

export function PricingPage({ inApp }: { inApp?: boolean }) {
  const { t, l, lang } = useI18n();
  const { plan: current } = useStore();
  const cards = (
    <>
      <Notice>{t('demo.pricing')}</Notice>
      <StaggerGroup className="grid grid-4" gap={0.08}>
        {MEMBERSHIP_PLANS.map((p) => (
          <motion.div key={p.id} variants={fadeUp} className={`card${p.highlight ? ' card-navy' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: 14, ['--pad' as string]: '24px', boxShadow: p.highlight ? 'var(--shadow-3)' : undefined }}>
            <div className="row between">
              <h2 className="h3" style={{ fontSize: '1.2rem' }}>{l(p.name)}</h2>
              {p.highlight && <span className="chip chip-gold">{t('pricing.popular')}</span>}
            </div>
            <p className={`small${p.highlight ? '' : ' muted'}`} style={p.highlight ? { color: 'rgba(243,238,230,.78)' } : undefined}>{l(p.tagline)}</p>
            <div>
              {p.demoPriceGhs !== null ? (
                <>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700 }}>{formatGhs(p.demoPriceGhs, lang)}</span>
                  <span className="small"> {t('pricing.month')}</span>
                </>
              ) : (
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700 }}>{t('pricing.quote')}</span>
              )}
              <div style={{ marginTop: 4 }}><DemoTag /></div>
            </div>
            <div className="plan-credits" data-dark={p.highlight || undefined}>
              <strong className="num">{p.credits}</strong>
              <span className="tiny">{t('pricing.credits')}</span>
              <Hint label={lang === 'fr' ? 'Qu’est-ce qu’un crédit ?' : 'What is a credit?'}>
                {lang === 'fr' ? 'Un crédit = une séance privée de 60 min avec un tuteur. Les classes de groupe n’utilisent pas de crédit.' : 'One credit = one 60-minute private session with a tutor. Group classes do not use credits.'}
              </Hint>
            </div>
            <ul className="stack small" style={{ listStyle: 'none', padding: 0, margin: 0, ['--gap' as string]: '8px', flex: 1 }}>
              {p.features.map((f) => (
                <li key={f.en} className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start', ['--gap' as string]: '8px' }}>
                  <span style={{ color: p.highlight ? '#E7C78F' : 'var(--green)' }}><Icon name="check" size={16} /></span>
                  {l(f)}
                </li>
              ))}
            </ul>
            {current === p.id && inApp ? (
              <span className="chip chip-gold" style={{ alignSelf: 'flex-start' }}>{t('billing.current')}</span>
            ) : p.demoPriceGhs === null ? (
              <Link to="/organisations" className={`btn ${p.highlight ? 'btn-gold' : 'btn-secondary'}`}>{t('pricing.contact')}</Link>
            ) : (
              <Link to={`/app/checkout/${p.id}`} className={`btn ${p.highlight ? 'btn-gold' : 'btn-primary'}`}>{t('pricing.choose')}</Link>
            )}
          </motion.div>
        ))}
      </StaggerGroup>
      <p className="small muted">{t('pricing.payWith')}</p>
      <div>
        <h2 className="h3" style={{ marginBottom: 14 }}>{t('pricing.additional')}</h2>
        <div className="grid grid-3">
          {ADDITIONAL_PACKAGES.map((p) => (
            <div key={p.id} className="card card-ivory">
              <h3 className="h4">{l(p.name)}</h3>
              <p className="small muted" style={{ marginTop: 4 }}>{l(p.blurb)}</p>
              <Link to="/organisations" className="link small" style={{ marginTop: 10 }}>{t('pricing.contact')} <Icon name="arrowRight" size={14} /></Link>
            </div>
          ))}
        </div>
      </div>
    </>
  );
  if (inApp) return <div className="stack" style={{ ['--gap' as string]: '24px' }}>{cards}</div>;
  return (
    <>
      <PageHero eyebrow={t('nav.pricing')} title={t('pricing.title')} sub={t('pricing.sub')} />
      <section className="section" style={{ paddingTop: 48 }}>
        <div className="container stack" style={{ ['--gap' as string]: '28px' }}>{cards}</div>
      </section>
    </>
  );
}

/* ---------- Organisations ---------- */

export function CorporatePage() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const [sent, setSent] = useState(false);
  return (
    <>
      <PageHero eyebrow={t('nav.corporate')} title={t('corp.title')} sub={t('corp.sub')} />
      <section className="section">
        <div className="container detail-grid">
          <div className="stack" style={{ ['--gap' as string]: '16px' }}>
            {(['corp.1', 'corp.2', 'corp.3', 'corp.4'] as const).map((k, i) => (
              <Reveal key={k} delay={i * 0.06} className="card row" as="div">
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, color: 'var(--gold-700)' }} aria-hidden>0{i + 1}</span>
                <span style={{ fontWeight: 600 }}>{t(k)}</span>
              </Reveal>
            ))}
          </div>
          <form
            className="card stack"
            style={{ ['--gap' as string]: '14px', ['--pad' as string]: '26px' }}
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
              toast(lang === 'fr' ? 'Demande enregistrée (démo — non envoyée)' : 'Request recorded (demo — not sent)');
            }}
          >
            <h2 className="h3">{t('corp.cta')}</h2>
            <label className="field"><span className="label">{lang === 'fr' ? 'Organisation' : 'Organisation'}</span><input className="input" required /></label>
            <label className="field"><span className="label">{t('auth.email')}</span><input className="input" type="email" required /></label>
            <label className="field"><span className="label">{lang === 'fr' ? 'Nombre de participants' : 'Number of participants'}</span><input className="input" type="number" min={1} /></label>
            <label className="field"><span className="label">{lang === 'fr' ? 'Vos objectifs' : 'Your goals'}</span><textarea className="textarea" /></label>
            <button className="btn btn-primary" disabled={sent}>{sent ? <><Icon name="check" size={16} /> {lang === 'fr' ? 'Enregistré' : 'Recorded'}</> : t('corp.cta')}</button>
            <p className="tiny muted">{lang === 'fr' ? 'Démo : aucun message n’est envoyé.' : 'Demo: no message is sent.'}</p>
          </form>
        </div>
      </section>
    </>
  );
}

/* ---------- About ---------- */

export function AboutPage() {
  const { t } = useI18n();
  return (
    <>
      <PageHero eyebrow={t('nav.about')} title={t('about.title')} sub={t('about.sub')} />
      <section className="section">
        <div className="container grid grid-2" style={{ ['--gap' as string]: '28px' }}>
          <Reveal className="card" as="div"><h2 className="h3">{t('about.mission')}</h2><p style={{ marginTop: 10, color: 'var(--ink-2)' }}>{t('about.missionBody')}</p></Reveal>
          <Reveal className="card card-navy" as="div" delay={0.1}><h2 className="h3">{t('about.audience')}</h2><p style={{ marginTop: 10, color: 'rgba(243,238,230,.82)' }}>{t('about.audienceBody')}</p></Reveal>
        </div>
      </section>
    </>
  );
}

/* ---------- Help ---------- */

export const FAQ = {
  en: [
    ['Which levels do you teach?', 'Pathways cover every CEFR level, from A1 beginners to C2 mastery. Not sure where you are? Take the free 15-minute placement test. Children aged 4–15 learn through La Porte Kids.'],
    ['How do live classes work?', 'Live group classes and private sessions are planned to run on Google Meet, with links in your workspace. In this prototype, meeting creation is simulated.'],
    ['How do I pay?', 'Memberships are intended to be paid by Mobile Money or card through Paystack. Payment comes before paid bookings and premium course access. Checkout in this prototype is simulated.'],
    ['Can I cancel or reschedule a lesson?', 'Yes, from “My lessons”. The final cancellation and credit policy is still being confirmed with the institute.'],
    ['Will I receive a certificate?', 'Your Performance Passport and completion records track your progress. Official DELF, TCF and TEF certificates are issued only by authorised exam centres after the official exam.'],
    ['Will I get reminders?', 'Email and WhatsApp reminders are planned. In this prototype they appear as sample notifications only.'],
  ],
  fr: [
    ['Quels niveaux proposez-vous ?', 'Nos parcours couvrent tous les niveaux du CECRL, du débutant A1 à la maîtrise C2. Vous ne connaissez pas votre niveau ? Passez le test de positionnement gratuit de 15 minutes. Les enfants de 4 à 15 ans apprennent avec La Porte Kids.'],
    ['Comment se déroulent les classes en direct ?', 'Les classes et séances privées sont prévues sur Google Meet, avec les liens dans votre espace. Dans ce prototype, la création des réunions est simulée.'],
    ['Comment payer ?', 'Les formules seront payables par Mobile Money ou carte via Paystack. Le paiement précède les réservations payantes et l’accès premium. Le paiement est simulé dans ce prototype.'],
    ['Puis-je annuler ou déplacer une séance ?', 'Oui, depuis « Mes séances ». La politique définitive d’annulation et de crédits est en cours de validation.'],
    ['Vais-je recevoir un certificat ?', 'Votre passeport et vos attestations de suivi retracent vos progrès. Les certificats officiels DELF, TCF et TEF sont délivrés uniquement par les centres d’examen agréés.'],
    ['Vais-je recevoir des rappels ?', 'Des rappels par e-mail et WhatsApp sont prévus. Dans ce prototype, ce sont des notifications d’exemple.'],
  ],
};

export function FaqList() {
  const { lang } = useI18n();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="card" style={{ ['--pad' as string]: '8px 24px' }}>
      {FAQ[lang].map(([q, a], i) => (
        <div key={q} style={{ borderBottom: i < FAQ[lang].length - 1 ? '1px solid var(--line)' : 0 }}>
          <button className="row between" style={{ width: '100%', background: 'none', border: 0, padding: '18px 0', cursor: 'pointer', textAlign: 'left', flexWrap: 'nowrap' }} aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
            <span style={{ fontWeight: 600, color: 'var(--navy)' }}>{q}</span>
            <motion.span animate={{ rotate: open === i ? 45 : 0 }} transition={spring.snappy}><Icon name="plus" size={18} /></motion.span>
          </button>
          <AnimatePresence initial={false}>
            {open === i && (
              <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', color: 'var(--ink-2)', paddingBottom: 18 }}>
                {a}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

export function HelpPage() {
  const { t } = useI18n();
  return (
    <>
      <PageHero eyebrow={t('nav.help')} title={t('help.title')} />
      <section className="section" style={{ paddingTop: 48 }}>
        <div className="container stack" style={{ ['--gap' as string]: '20px', maxWidth: 860 }}>
          <FaqList />
          <p className="muted small">{t('help.contact')}</p>
        </div>
      </section>
    </>
  );
}

/* ---------- Auth (simulated) ---------- */

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { t, l, lang } = useI18n();
  const navigate = useNavigate();
  const { actions } = useStore();
  const [params] = useSearchParams();
  const toPlacement = params.get('next') === 'placement';
  const enter = (role: 'learner' | 'instructor' | 'admin') => {
    if (role === 'learner') actions.useDemoLearner();
    else actions.setRole(role);
    navigate(role === 'learner' ? '/app' : `/${role}`);
  };
  const [authError, setAuthError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Sign-up creates a new learner account; log-in finds one by email. New learners then choose a
  // starting level (entry assessment or A1) before using the app.
  const submit = async (form: HTMLFormElement) => {
    const data = new FormData(form);
    setAuthError(null);
    setBusy(true);
    try {
      if (mode === 'register') {
        await actions.register({ name: String(data.get('name') ?? ''), email: String(data.get('email') ?? ''), areaId: String(data.get('area') ?? 'everyday') as CourseAreaId });
        writeLocal(START_PENDING_KEY, '1');
        navigate('/start');
      } else {
        await actions.login(String(data.get('email') ?? ''));
        navigate(toPlacement ? '/start' : '/app');
      }
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section style={{ background: 'radial-gradient(80% 100% at 80% 0%, #FFF6E6 0%, var(--ivory) 60%)', minHeight: 'calc(100vh - 72px)' }}>
      <div className="container" style={{ display: 'grid', placeItems: 'center', paddingBlock: 56 }}>
        <motion.div className="card" style={{ width: 'min(480px, 100%)', ['--pad' as string]: '32px', boxShadow: 'var(--shadow-3)' }} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={spring.settle}>
          <h1 style={{ fontSize: '2rem' }}>{mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}</h1>
          {(mode === 'register' || toPlacement) && (
            <p className="small muted" style={{ marginTop: 6 }}>
              {lang === 'fr' ? 'Ensuite : un test de positionnement de 15 minutes pour trouver votre niveau (vous pouvez le passer et commencer au niveau A1).' : 'Next: a 15-minute placement test to find your level (you can skip it and start at A1).'}
            </p>
          )}
          <form
            className="stack"
            style={{ ['--gap' as string]: '14px', marginTop: 20 }}
            onSubmit={(e) => {
              e.preventDefault();
              void submit(e.currentTarget);
            }}
          >
            {mode === 'register' && (
              <>
                <label className="field"><span className="label">{t('auth.name')}</span><input className="input" name="name" autoComplete="name" required minLength={2} /></label>
                <label className="field">
                  <span className="label">{t('auth.goal')}</span>
                  <select className="select" name="area" defaultValue="everyday">
                    {COURSE_AREAS.map((a) => (
                      <option key={a.id} value={a.id}>{l(a.name)}</option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <label className="field"><span className="label">{t('auth.email')}</span><input className="input" name="email" type="email" autoComplete="email" required /></label>
            <label className="field"><span className="label">{t('auth.password')}</span><input className="input" name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={6} /></label>
            {authError && <p className="field-error" role="alert">{authError}{mode === 'register' && authError.includes('Log in') ? <> <Link to="/login" className="link">{t('nav.login')}</Link></> : null}</p>}
            <button className="btn btn-primary btn-lg" disabled={busy} aria-busy={busy}>{t('auth.continue')}</button>
            {mode === 'login' && <p className="tiny muted">{lang === 'fr' ? 'Démo : connectez-vous avec l’e-mail de votre compte (Ama : ama@laporte.demo). Pas de mot de passe dans le prototype.' : 'Demo: log in with your account’s email (Ama: ama@laporte.demo). The prototype has no passwords.'}</p>}
          </form>
          <Notice>{t('auth.notice')}</Notice>
          <p className="small muted" style={{ marginTop: 18 }}>{t('auth.or')}</p>
          <div className="row" style={{ marginTop: 10, ['--gap' as string]: '8px' }}>
            {(['learner', 'instructor', 'admin'] as const).map((r) => (
              <button key={r} className="btn btn-secondary btn-sm" onClick={() => enter(r)}>{t(`role.${r}`)}</button>
            ))}
          </div>
          <p className="small" style={{ marginTop: 20 }}>
            {mode === 'login' ? t('auth.noAccount') : t('auth.haveAccount')}{' '}
            <Link className="link" to={mode === 'login' ? '/register' : '/login'}>{mode === 'login' ? t('auth.register') : t('nav.login')}</Link>
          </p>
        </motion.div>
      </div>
    </section>
  );
}

const LEVEL_ORDER: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/** True when a course's level range (e.g. "A2–B1") includes the given level. */
function coversLevel(course: Course, level: CefrLevel) {
  const found = course.levels.match(/[ABC][12]/g) as CefrLevel[] | null;
  if (!found) return false;
  const lo = LEVEL_ORDER.indexOf(found[0]);
  const hi = LEVEL_ORDER.indexOf(found[found.length - 1]);
  const i = LEVEL_ORDER.indexOf(level);
  return i >= lo && i <= hi;
}

/** Weekdays with at least one bookable slot, from the tutor's weekly availability. */
export function teachingDays(tutor: Tutor, lang: 'en' | 'fr') {
  const names = lang === 'fr' ? ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = Object.entries(tutor.availability).filter(([, times]) => times.length).map(([d]) => names[Number(d) - 1]);
  return days.length ? days.join(' · ') : '—';
}
