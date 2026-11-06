import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';

/*
 * "One learner's journey": three short, silent clips of the same La Porte learner (the man from the
 * Café banner). Video is kept for moments people see rarely: the How it works page, the start
 * screen after sign-up, and passing an end-of-level assessment. Each clip plays ONCE and rests on
 * its last frame; nothing loops, so no pause control is needed.
 * Reduced motion, data saver or a slow connection → the still last frame, and no video is loaded.
 */

export type ClipName = 'learner-reading' | 'learner-speaking' | 'learner-success';

const BASE = '/videos/';

/** Whether to show stills instead of video. */
export function preferStill() {
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
    const nav = navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } };
    if (nav.connection?.saveData || /(^|-)2g|3g/.test(nav.connection?.effectiveType ?? '')) return true;
    return false;
  } catch {
    return false;
  }
}

/** `idle`: what shows while not playing: the opening frame (waiting its turn) or the resting last frame (already seen). */
export function StoryClip({ name, play, onEnded, className = '', idle = 'first' }: { name: ClipName; play: boolean; onEnded?: () => void; className?: string; idle?: 'first' | 'last' }) {
  const [still] = useState(preferStill);
  const [ended, setEnded] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const done = useRef(onEnded);
  done.current = onEnded;

  useEffect(() => {
    const v = video.current;
    if (still || !v || !play || ended) return;
    v.play().catch(() => { setEnded(true); done.current?.(); }); // autoplay refused: show the last frame
  }, [play, still, ended]);

  // Stills (or a finished clip that was never started) show the resting last frame.
  if (still || (idle === 'last' && !play)) return <span className={`story-clip ${className}`}><img src={`${BASE}${name}-last.webp`} alt="" width={960} height={540} decoding="async" loading="lazy" /></span>;
  return (
    <span className={`story-clip ${className}`} data-ended={ended || undefined}>
      <video
        ref={video}
        muted
        playsInline
        preload={play ? 'auto' : 'metadata'}
        poster={`${BASE}${name}-first.webp`}
        aria-hidden="true"
        tabIndex={-1}
        disablePictureInPicture
        onEnded={() => { setEnded(true); done.current?.(); }}
        width={1280}
        height={720}
      >
        <source src={`${BASE}${name}.webm`} type="video/webm" />
        <source src={`${BASE}${name}.mp4`} type="video/mp4" />
      </video>
    </span>
  );
}

/** True once the element has been at least `ratio` visible (then stays true). */
export function useSeen<T extends Element>(ratio = 0.5) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === 'undefined') { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: ratio });
    io.observe(el);
    return () => io.disconnect();
  }, [ratio, seen]);
  return [ref, seen] as const;
}

const STEPS: { clip: ClipName; n: string; en: [string, string]; fr: [string, string] }[] = [
  { clip: 'learner-reading', n: '02', en: ['Learn at your pace', 'Short lessons, notes and quizzes at your own level.'], fr: ['Apprenez à votre rythme', 'Des leçons courtes, des notes et des quiz à votre niveau.'] },
  { clip: 'learner-speaking', n: '03', en: ['Practise speaking', 'Live sessions and the Speaking Studio get you talking.'], fr: ['Pratiquez à l’oral', 'Les séances en direct et le Speaking Studio vous font parler.'] },
  { clip: 'learner-success', n: '04', en: ['Prove what you can do', 'Pass each level’s assessment and move up.'], fr: ['Montrez vos progrès', 'Réussissez l’évaluation de chaque niveau et passez au suivant.'] },
];

/**
 * The three clips as one story: study → speak → succeed. Each clip plays once, in order: a clip
 * starts when its step is on screen AND the previous clip has finished. Side by side on wide
 * screens they play one after another; stacked on phones, each plays as it is scrolled to.
 */
export function StoryStrip({ compact = false, numbered = true }: { compact?: boolean; numbered?: boolean }) {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const [turn, setTurn] = useState(0);
  return (
    <ol className={compact ? 'story-strip story-strip-compact' : 'story-strip'}>
      {STEPS.map((s, i) => {
        const [title, body] = fr ? s.fr : s.en;
        return (
          <StoryStep key={s.clip} clip={s.clip} myTurn={turn >= i} onEnded={() => setTurn((t) => Math.max(t, i + 1))}>
            {numbered && <span className="story-num">{s.n}</span>}
            <strong className="story-title">{title}</strong>
            {!compact && <span className="story-body">{body}</span>}
          </StoryStep>
        );
      })}
    </ol>
  );
}

function StoryStep({ clip, myTurn, onEnded, children }: { clip: ClipName; myTurn: boolean; onEnded: () => void; children: React.ReactNode }) {
  const [ref, seen] = useSeen<HTMLLIElement>(0.6);
  return (
    <li ref={ref} className="story-step">
      <StoryClip name={clip} play={seen && myTurn} onEnded={onEnded} />
      <span className="story-text">{children}</span>
    </li>
  );
}
