import { motion, useAnimationControls, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/ui/Icon';
import { useI18n } from '../../i18n/I18nProvider';
import { readLocal, writeLocal } from '../../utils/storage';

const CHECKIN_KEY = 'laporte-checkin';
const COLORS = ['#6e1630', '#c49a5a', '#141b34', '#e7c78f', '#b03a5b'];

/**
 * The dashboard's study buddy. He celebrates the learner's first visit each day (sign-in / check-in)
 * and every reward claimed, and pulls out a card with their leaderboard rank and points.
 * The artwork is a single illustration, so "expression" comes from motion: hop, wiggle, confetti, speech.
 */
export function HeroBuddy({ firstName, rank, of, points, level, cheer }: { firstName: string; rank: number; of: number; points: number; level: string; cheer: number }) {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const reduce = useReducedMotion();
  const body = useAnimationControls();
  const [bubble, setBubble] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const timer = useRef<number>();

  const excite = (message: string) => {
    setBubble(message);
    setBurst((b) => b + 1);
    if (!reduce) void body.start({ y: [0, -34, 0, -14, 0], rotate: [0, -5, 5, -2, 0], scaleY: [1, 0.94, 1.05, 0.98, 1], transition: { duration: 1.1, ease: 'easeOut' } });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setBubble(null), 4500);
  };

  // Daily check-in: the first dashboard visit of the day (right after signing in or coming back).
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (readLocal(CHECKIN_KEY) === today) return;
    writeLocal(CHECKIN_KEY, today);
    const t = window.setTimeout(() => excite(fr ? `Bonjour ${firstName} ! Content de te revoir.` : `Bonjour ${firstName}! Great to see you.`), 800);
    return () => window.clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Rewards claimed elsewhere on the dashboard.
  useEffect(() => {
    if (cheer > 0) excite(fr ? 'Bravo ! Des points en plus !' : 'Bravo! More points!');
  }, [cheer]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <>
      <motion.button
        type="button"
        className="hero-buddy"
        onClick={() => excite(fr ? 'Allez, on continue !' : 'Allez, on continue! Keep going!')}
        aria-label={fr ? 'Dire bonjour' : 'Say hello'}
        initial={{ opacity: 0, y: 30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 160, damping: 20, delay: 0.2 }}
      >
        <motion.img src="/images/hero-student.png" alt="" width={1024} height={1024} className="hero-student" animate={body} style={{ originY: 1 }} />
      </motion.button>

      {/* Confetti burst (CSS-driven so it runs everywhere; skipped with reduced motion) */}
      {burst > 0 && !reduce && (
        <span key={`burst-${burst}`} className="buddy-burst" aria-hidden>
          {Array.from({ length: 14 }, (_, i) => {
            const a = (i / 14) * Math.PI * 2;
            const d = 70 + (i % 3) * 26;
            return <span key={i} style={{ background: COLORS[i % COLORS.length], borderRadius: i % 2 ? 2 : 99, ['--x' as string]: `${Math.round(Math.cos(a) * d)}px`, ['--y' as string]: `${Math.round(Math.sin(a) * d * 0.8 - 30)}px`, ['--r' as string]: `${i % 2 ? 200 : -200}deg` }} />;
          })}
        </span>
      )}

      {/* Speech bubble */}
      {bubble && (
        <div key={`bubble-${burst}`} className="buddy-bubble" role="status" lang="fr">
          {bubble}
        </div>
      )}

      {/* The card he pulls out: rank and points. Re-pops on every celebration. */}
      <div key={`card-${burst}`} className={`buddy-card${burst ? ' buddy-card-again' : ''}`}>
        <Link to="/app/community" aria-label={fr ? `Classement : ${rank}e sur ${of}, ${points} points` : `Leaderboard: rank ${rank} of ${of}, ${points} points`}>
          <span className="buddy-card-kicker"><Icon name="star" size={11} /> {fr ? 'Classement' : 'Leaderboard'}</span>
          <span className="buddy-card-rank num">#{rank}<small> / {of}</small></span>
          <span className="buddy-card-points"><strong className="num">{points}</strong> pts · {level}</span>
        </Link>
      </div>
    </>
  );
}
