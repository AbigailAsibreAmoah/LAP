import { COURSE_AREAS, COURSES, PATHWAYS } from '@laporte/shared';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Doorway3D } from '../../components/3d/Doorway3D';
import { Reveal, StaggerGroup } from '../../components/animations/Reveal';
import { fadeUp } from '../../components/animations/motion';
import { Icon } from '../../components/ui/Icon';
import { PerformancePassport } from '../../features/performance-passport/PerformancePassport';
import { LivingAcademyHero } from '../../features/showcase/LivingAcademyHero';
import { WorkspaceShowcase } from '../../features/showcase/WorkspaceShowcase';
import { SpeakingStudio } from '../../features/speaking-studio/SpeakingStudio';
import { useI18n } from '../../i18n/I18nProvider';
import { useStore } from '../../state/AppStore';

export function HomePage() {
  const { t, l, lang } = useI18n();
  const navigate = useNavigate();
  const { actions } = useStore();

  const enterAs = (role: 'learner' | 'instructor' | 'admin') => {
    actions.setRole(role);
    navigate(role === 'learner' ? '/app' : `/${role}`);
  };

  return (
    <>
      <LivingAcademyHero />

      <Pathways />

      {/* How it works — how a visitor begins */}
      <section className="section section-rule">
        <div className="container">
          <Reveal className="section-head">
            <span className="eyebrow">{t('home.howEyebrow')}</span>
            <h2>{t('home.howTitle')}</h2>
          </Reveal>
          <HowSteps />
        </div>
      </section>

      {/* Signature experience two */}
      <section className="section" style={{ background: 'var(--ivory)' }}>
        <div className="container">
          <Reveal className="section-head">
            <span className="eyebrow">{t('home.showcaseEyebrow')}</span>
            <h2>{t('home.showcaseTitle')}</h2>
            <p className="lede">{t('home.showcaseSub')}</p>
          </Reveal>
          <Reveal>
            <WorkspaceShowcase />
          </Reveal>
        </div>
      </section>

      {/* Signature experience three */}
      <section className="section">
        <div className="container">
          <Reveal className="split-head" as="div">
            <div className="section-head" style={{ marginBottom: 0 }}>
              <span className="eyebrow">{t('home.studioEyebrow')}</span>
              <h2>{t('home.studioTitle')}</h2>
              <p className="lede">{t('home.studioSub')}</p>
            </div>
            <Link to="/app/studio" className="btn btn-secondary">
              {t('home.tryStudio')} <Icon name="arrowRight" size={16} />
            </Link>
          </Reveal>
          <Reveal>
            <SpeakingStudio embedded />
          </Reveal>
        </div>
      </section>

      {/* Signature experience four */}
      <section className="section" style={{ background: 'var(--ivory)' }}>
        <div className="container">
          <Reveal className="section-head">
            <span className="eyebrow">{t('home.passportEyebrow')}</span>
            <h2>{t('home.passportTitle')}</h2>
            <p className="lede">{t('home.passportSub')}</p>
          </Reveal>
          <Reveal>
            <PerformancePassport readOnly />
          </Reveal>
        </div>
      </section>

      {/* Course areas — an editorial index rather than a grid of identical cards */}
      <section className="section">
        <div className="container">
          <Reveal className="section-head">
            <span className="eyebrow">{t('home.areasEyebrow')}</span>
            <h2>{t('home.areasTitle')}</h2>
          </Reveal>
          <StaggerGroup className="area-index" gap={0.04}>
            {COURSE_AREAS.map((a, i) => {
              const count = COURSES.filter((c) => c.area === a.id).length;
              return (
                <motion.div key={a.id} variants={fadeUp}>
                  <Link to={`/courses?area=${a.id}`} className="area-row">
                    <span className="area-num num">{String(i + 1).padStart(2, '0')}</span>
                    <span className="area-text">
                      <span className="area-name">{l(a.name)}</span>
                      <span className="small muted">{l(a.blurb)}</span>
                    </span>
                    <span className="area-meta tiny muted num">{count} {t('home.pathCourses')}</span>
                    <Icon name="arrowRight" size={18} />
                  </Link>
                </motion.div>
              );
            })}
          </StaggerGroup>
          <p className="small muted" style={{ marginTop: 20 }}>{t('courses.future')}</p>
        </div>
      </section>

      {/* Closing */}
      <section className="closing">
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 40, alignItems: 'center', paddingBlock: 'clamp(64px, 9vw, 110px)' }}>
          <Reveal className="stack" as="div">
            <h2 style={{ color: '#fff' }}>{t('home.closingTitle')}</h2>
            <p className="lede" style={{ color: 'rgba(243,238,230,.78)' }}>{t('home.closingSub')}</p>
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn btn-gold btn-lg" onClick={() => enterAs('learner')}>
                {t('role.learner')} <Icon name="arrowRight" size={17} />
              </button>
              <button className="btn btn-lg btn-on-dark" onClick={() => enterAs('instructor')}>
                {t('role.instructor')}
              </button>
              <button className="btn btn-lg btn-on-dark" onClick={() => enterAs('admin')}>
                {t('role.admin')}
              </button>
            </div>
            <p className="tiny" style={{ color: 'rgba(243,238,230,.55)' }}>{t('role.notice')}</p>
          </Reveal>
          <div style={{ display: 'grid', placeItems: 'center' }} aria-hidden>
            <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 1 }}>
              <ViewportDoor />
            </motion.div>
          </div>
        </div>
        <p className="sr-only">{lang === 'fr' ? 'Fin de la page d’accueil' : 'End of home page'}</p>
      </section>
    </>
  );
}

function ViewportDoor() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-120px' });
  const reduce = useReducedMotion();
  return (
    <div ref={ref} style={{ position: 'relative', width: 'min(320px, 78vw)', aspectRatio: '32 / 41' }}>
      <Doorway3D variant="standalone" open={inView} still={Boolean(reduce)} fallbackWidth={230} />
    </div>
  );
}

function Pathways() {
  const { t, l } = useI18n();
  return (
    <section className="section pathways" aria-labelledby="path-h">
      <div className="container">
        <Reveal className="split-head" as="div">
          <div className="section-head" style={{ marginBottom: 0 }}>
            <span className="eyebrow">{t('home.pathEyebrow')}</span>
            <h2 id="path-h">{t('home.pathTitle')}</h2>
            <p className="lede">{t('home.pathSub')}</p>
          </div>
          <Link to="/courses" className="btn btn-secondary">
            {t('home.pathCta')} <Icon name="arrowRight" size={16} />
          </Link>
        </Reveal>
        <StaggerGroup className="stairs" gap={0.1}>
          {PATHWAYS.map((p, i) => (
            <motion.article key={p.level} variants={fadeUp} className="stair" style={{ ['--step' as string]: i }}>
              <div className="stair-level">{p.level}</div>
              <h3 className="stair-name">{l(p.name)}</h3>
              <p className="small">{l(p.canDo)}</p>
              <dl className="stair-meta tiny">
                <div><dt className="num">{p.weeks}</dt><dd>{t('home.pathWeeks')}</dd></div>
                <div><dt className="num">{p.courseIds.length}</dt><dd>{t('home.pathCourses')}</dd></div>
              </dl>
            </motion.article>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}

export function HowSteps() {
  const { t } = useI18n();
  const steps = [
    { n: '01', icon: 'door', title: t('how.1.title'), body: t('how.1.body') },
    { n: '02', icon: 'book', title: t('how.2.title'), body: t('how.2.body') },
    { n: '03', icon: 'meet', title: t('how.3.title'), body: t('how.3.body') },
    { n: '04', icon: 'passport', title: t('how.4.title'), body: t('how.4.body') },
  ] as const;
  return (
    <StaggerGroup className="grid grid-4" gap={0.1}>
      {steps.map((s) => (
        <motion.div key={s.n} variants={fadeUp} className="how-step">
          <div className="row between">
            <span className="how-num">{s.n}</span>
            <span className="how-icon"><Icon name={s.icon} size={20} /></span>
          </div>
          <h3 style={{ fontSize: '1.18rem' }}>{s.title}</h3>
          <p className="small muted">{s.body}</p>
        </motion.div>
      ))}
    </StaggerGroup>
  );
}
