import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform, type Variants } from 'motion/react';
import { useEffect, useRef, type ReactNode } from 'react';
import { fadeUp, stagger } from './motion';

/** Reveals children once when scrolled into view. */
export function Reveal({
  children,
  className,
  variants = fadeUp,
  delay = 0,
  as = 'div',
}: {
  children: ReactNode;
  className?: string;
  variants?: Variants;
  delay?: number;
  as?: 'div' | 'section' | 'li' | 'article';
}) {
  const Comp = motion[as];
  return (
    <Comp
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      variants={variants}
      transition={{ delay }}
    >
      {children}
    </Comp>
  );
}

/** Staggers direct `motion` children that use `fadeUp`-style variants. */
export function StaggerGroup({ children, className, gap = 0.08, delay = 0 }: { children: ReactNode; className?: string; gap?: number; delay?: number }) {
  return (
    <motion.div className={className} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} variants={stagger(gap, delay)}>
      {children}
    </motion.div>
  );
}

/** Counts up to a value the first time it enters the viewport. */
export function CountUp({ value, format = (n) => Math.round(n).toString(), duration = 1.2 }: { value: number; format?: (n: number) => string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? value : 0);
  const text = useTransform(mv, (v) => format(v));

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [inView, value, reduce, mv, duration]);

  return <motion.span ref={ref} className="num">{text}</motion.span>;
}

/** A progress bar that fills on mount / when its value changes. */
export function AnimatedBar({ value, tone, delay = 0, onDark, label }: { value: number; tone?: 'gold'; delay?: number; onDark?: boolean; label?: string }) {
  return (
    <div
      className={`bar${tone === 'gold' ? ' bar-gold' : ''}${onDark ? ' bar-on-dark' : ''}`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <motion.span initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 1.1, delay, ease: [0.22, 1, 0.36, 1] }} />
    </div>
  );
}
