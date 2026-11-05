import { LEARNERS, TUTORS } from '@laporte/shared';
import { motion, useReducedMotion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Waveform } from '../../components/3d/Depth';
import { Avatar } from '../../components/3d/Portrait';
import { LearnerScene } from '../../components/3d/Scene';
import { ease } from '../../components/animations/motion';
import { Icon, type IconName } from '../../components/ui/Icon';
import { useI18n } from '../../i18n/I18nProvider';

const line = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: ease.out } } };
const ama = LEARNERS.find((l) => l.id === 'lrn-ama')!;
const sophie = TUTORS[0];
const classmates = LEARNERS.filter((l) => ['lrn-kofi', 'lrn-grace', 'lrn-chinedu', 'lrn-efua'].includes(l.id));

/** A glass card that drifts gently around the doorway (static when motion is reduced). */
function Floating({ className, delay, children }: { className: string; delay: number; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={`hero-float ${className}`}
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={reduce ? { opacity: 1, y: 0, scale: 1 } : { opacity: 1, y: [0, -8, 0], scale: 1 }}
      transition={reduce ? { duration: 0.4, delay } : { opacity: { duration: 0.6, delay }, scale: { duration: 0.6, delay }, y: { duration: 6, delay, repeat: Infinity, ease: 'easeInOut' } }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Landing cover. La Porte means "the door": a gold-framed arch opens onto a learner's world,
 * with the real product (live class, accents, CEFR progress, small groups) floating around it.
 */
export function HomeHero() {
  const { t, lang } = useI18n();
  const fr = lang === 'fr';
  const cards: { icon: IconName; title: string; body: string; to: string }[] = [
    { icon: 'door', title: fr ? 'Pourquoi La Porte ?' : 'Why La Porte?', body: fr ? 'Un institut complet, pensé pour les professionnels africains.' : 'A complete institute, built for African professionals.', to: '/about' },
    { icon: 'award', title: fr ? 'Ce que vous gagnez' : 'What you gain', body: fr ? 'Confiance à l’oral, progrès CECRL mesurables.' : 'Speaking confidence and measurable CEFR progress.', to: '/pricing' },
    { icon: 'checkCircle', title: fr ? 'Comment vous progressez' : 'How you progress', body: fr ? 'Leçons, immersion individuelle et retours de tuteurs.' : 'Lessons, one-on-one immersion and tutor feedback.', to: '/how-it-works' },
    { icon: 'briefcase', title: fr ? 'Pour les organisations' : 'For organisations', body: fr ? 'Formations sur mesure pour vos équipes.' : 'Tailored French training for your teams.', to: '/organisations' },
  ];

  return (
    <section className="home-hero" aria-labelledby="home-hero-h">
      <div className="home-hero-bg" aria-hidden>
        <svg className="hero-arches" viewBox="0 0 800 800" preserveAspectRatio="xMidYMid slice">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <path key={i} d={`M${160 + i * 40} 800V${380 - i * 20}a${240 - i * 40} ${240 - i * 40} 0 0 1 ${480 - i * 80} 0V800`} fill="none" stroke="url(#arch-gold)" strokeWidth="1" opacity={0.5 - i * 0.07} />
          ))}
          <defs>
            <linearGradient id="arch-gold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e7c78f" />
              <stop offset="100%" stopColor="#e7c78f" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="container home-hero-inner">
        <motion.div className="home-hero-copy" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } } }}>
          <motion.span className="hero-pill" variants={line}>
            <span className="hero-pill-dot" /> {fr ? 'Institut de français en ligne · A1–C2' : 'Online French institute · A1–C2'}
          </motion.span>
          <h1 id="home-hero-h">
            <motion.span style={{ display: 'block' }} variants={line}>{t('home.title1')}</motion.span>
            <motion.em style={{ display: 'block' }} variants={line}>{t('home.title2')}</motion.em>
          </h1>
          <motion.p className="home-hero-sub" variants={line}>{t('home.sub')}</motion.p>
          <motion.div className="row" variants={line} style={{ ['--gap' as string]: '12px' }}>
            <Link to="/register" className="btn btn-gold btn-lg">{t('home.cta')} <Icon name="arrowRight" size={18} /></Link>
            <Link to="/courses" className="btn btn-lg btn-on-photo">{t('home.cta2')}</Link>
          </motion.div>
          <motion.div className="hero-proof" variants={line}>
            <span className="avatar-stack">{classmates.map((c) => <Avatar key={c.id} spec={c.portrait} size={34} />)}</span>
            <span className="small">{fr ? 'Des professionnels d’Accra, Lagos, Nairobi et au-delà apprennent avec La Porte.' : 'Professionals in Accra, Lagos, Nairobi and beyond learn with La Porte.'}</span>
          </motion.div>
        </motion.div>

        <div className="hero-door-wrap">
          <motion.div className="hero-door" initial={{ opacity: 0, y: 30, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.9, ease: ease.out, delay: 0.15 }}>
            <div className="hero-door-light" aria-hidden />
            <div className="hero-door-scene" aria-hidden><LearnerScene kind="meeting" spec={ama.portrait} expression="joy" accessory="headphones" /></div>
          </motion.div>

          <Floating className="hf-live" delay={0.7}>
            <div className="row" style={{ ['--gap' as string]: '10px', flexWrap: 'nowrap' }}>
              <Avatar spec={sophie.portrait} size={36} />
              <div style={{ minWidth: 0 }}>
                <span className="hf-kicker"><span className="live-dot" /> {fr ? 'En direct · Google Meet' : 'Live · Google Meet'}</span>
                <strong lang="fr">Exprimer son accord</strong>
                <span className="hf-meta">{sophie.name} · 18:00</span>
              </div>
            </div>
          </Floating>

          <Floating className="hf-accent" delay={0.95}>
            <span className="hf-kicker"><Icon name="headphones" size={12} /> {fr ? 'Écoute · accents' : 'Listening · accents'}</span>
            <Waveform active still bars={16} color="#b03a5b" height={22} />
            <span className="hf-meta">Dakar · Abidjan · Lomé · Paris</span>
          </Floating>

          <Floating className="hf-progress" delay={1.2}>
            <span className="hf-kicker">{fr ? 'Progression CECRL' : 'CEFR progress'}</span>
            <div className="row between" style={{ flexWrap: 'nowrap' }}><strong>A2 → B1</strong><strong className="num" style={{ color: 'var(--burgundy)' }}>{ama.progressToNext}%</strong></div>
            <div className="hf-bar"><motion.span initial={{ width: 0 }} animate={{ width: `${ama.progressToNext}%` }} transition={{ duration: 1.4, delay: 1.4, ease: ease.out }} /></div>
          </Floating>

          <Floating className="hf-group" delay={1.45}>
            <Icon name="users" size={14} /> <span>{fr ? 'Groupe · 3/5 places' : 'Group · 3 of 5 seats'}</span>
          </Floating>
        </div>
      </div>

      <div className="container">
        <motion.ul className="home-hero-cards" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.45 } } }}>
          {cards.map((c) => (
            <motion.li key={c.to} variants={line}>
              <Link to={c.to} className="home-hero-card">
                <span className="home-hero-card-icon"><Icon name={c.icon} size={26} stroke={1.5} /></span>
                <strong>{c.title}</strong>
                <span className="small muted">{c.body}</span>
              </Link>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
