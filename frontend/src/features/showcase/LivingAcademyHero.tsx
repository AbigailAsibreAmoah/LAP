import { LEARNERS, TUTORS } from '@laporte/shared';
import { AnimatePresence, motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Doorway3D } from '../../components/3d/Doorway3D';
import { Waveform } from '../../components/3d/Depth';
import { Avatar } from '../../components/3d/Portrait';
import { ease, spring } from '../../components/animations/motion';
import { Icon } from '../../components/ui/Icon';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useTimeline } from '../../hooks/useTimeline';
import { useI18n } from '../../i18n/I18nProvider';

/*
 * Storyboard (≈4s): 0 headline · 1 the doorway opens and light spills through
 * 2 a glimpse of the learner workspace settles in front · 3 the listening line plays, then rests.
 * The CTA is usable from the first frame; Skip/Replay are always offered.
 */
const DURATIONS = [600, 1900, 1100, 0];
const FINAL = 3;

const ama = LEARNERS.find((l) => l.id === 'lrn-ama')!;
const sophie = TUTORS[0];

export function LivingAcademyHero() {
  const { t, lang } = useI18n();
  const mobile = useIsMobile();
  const tl = useTimeline({ durations: DURATIONS, restingStep: FINAL });
  const s = tl.step;
  const done = s >= FINAL;

  return (
    <section className="hero">
      <div className="container hero-grid">
        {/* Copy column — always immediately usable */}
        <motion.div className="hero-copy" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } } }}>
          <motion.span className="eyebrow" variants={line}>{t('home.eyebrow')}</motion.span>
          <h1 className="display-xl">
            <motion.span style={{ display: 'block' }} variants={line}>{t('home.title1')}</motion.span>
            <motion.span style={{ display: 'block', fontStyle: 'italic', color: 'var(--burgundy)' }} variants={line}>
              {t('home.title2')}
            </motion.span>
          </h1>
          <motion.p className="lede" variants={line}>{t('home.sub')}</motion.p>
          <motion.div className="row" variants={line} style={{ ['--gap' as string]: '12px' }}>
            <Link to="/register" className="btn btn-primary btn-lg">
              {t('home.cta')} <Icon name="arrowRight" size={18} />
            </Link>
            <Link to="/courses" className="btn btn-secondary btn-lg">
              {t('home.cta2')}
            </Link>
          </motion.div>
          <motion.ul variants={line} className="hero-facts">
            {(['home.trust1', 'home.trust2', 'home.trust3'] as const).map((k) => (
              <li key={k}>
                <Icon name="check" size={14} stroke={2.2} /> {t(k)}
              </li>
            ))}
          </motion.ul>
        </motion.div>

        {/* Stage: the doorway in real-time 3D, then a glimpse of the workspace beyond it */}
        <div className="hero-stage">
          <div className="hero-canvas" role="img" aria-label={lang === 'fr' ? 'Une porte en 3D s’ouvre sur la tour Eiffel dans la lumière dorée : l’entrée de La Porte.' : 'A 3D doorway opens onto the Eiffel Tower in golden light: the entrance to La Porte.'}>
            <Doorway3D open={s >= 1} still={tl.reduce} fallbackWidth={mobile ? 200 : 260} />
          </div>

          <AnimatePresence>
            {s >= 2 && (
              <motion.aside
                key="glimpse"
                className="hero-glimpse"
                aria-label={lang === 'fr' ? 'Aperçu de l’espace apprenant (démo)' : 'Learner workspace preview (demo)'}
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={spring.settle}
              >
                <div className="row between" style={{ flexWrap: 'nowrap' }}>
                  <span className="kicker">{lang === 'fr' ? 'Votre espace · aperçu' : 'Your workspace · preview'}</span>
                  <span className="demo-tag">{t('demo.label')}</span>
                </div>
                <div className="row" style={{ ['--gap' as string]: '12px', flexWrap: 'nowrap', marginTop: 12 }}>
                  <Avatar spec={ama.portrait} size={40} expression="smile" />
                  <div style={{ minWidth: 0 }}>
                    <div className="glimpse-title">Bonjour, Ama</div>
                    <div className="tiny muted">{lang === 'fr' ? 'Séance privée · demain 10 h 00 · ' : 'Private lesson · tomorrow 10:00 · '}{sophie.name}</div>
                  </div>
                </div>
                <div className="glimpse-progress">
                  <div className="row between tiny" style={{ fontWeight: 700 }}>
                    <span>Business French · A2</span>
                    <span className="num">{ama.progressToNext}% → B1</span>
                  </div>
                  <div className="bar" style={{ height: 5 }}>
                    <motion.span initial={{ width: 0 }} animate={{ width: `${ama.progressToNext}%` }} transition={{ duration: tl.reduce ? 0 : 1.2, ease: ease.out, delay: 0.2 }} />
                  </div>
                </div>
                <AnimatePresence>
                  {s >= 3 && (
                    <motion.div key="wave" className="glimpse-wave" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.5, ease: ease.out }}>
                      <Icon name="headphones" size={16} />
                      <Waveform active={false} still bars={10} color="#E7C78F" height={18} />
                      <span lang="fr">Écoutez, répétez, progressez.</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.aside>
            )}
          </AnimatePresence>

          <div className="hero-controls">
            {done ? (
              <button className="btn btn-ghost btn-sm" onClick={tl.replay}>
                <Icon name="replay" size={15} /> {t('home.replay')}
              </button>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={tl.skip}>
                {t('home.skipIntro')} <Icon name="chevronRight" size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

const line = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: ease.out } } };
