// Shared motion tokens. Every animated component draws timing and easing from here
// so the product moves with one consistent rhythm.
import type { Transition, Variants } from 'motion/react';

export const ease = {
  out: [0.22, 1, 0.36, 1] as const, // confident deceleration — default
  inOut: [0.65, 0, 0.35, 1] as const, // for elements that travel between anchors
  soft: [0.4, 0, 0.2, 1] as const,
};

export const duration = {
  fast: 0.2,
  base: 0.45,
  slow: 0.8,
  scene: 1.2,
};

export const spring = {
  settle: { type: 'spring', stiffness: 170, damping: 24, mass: 0.9 } as Transition,
  snappy: { type: 'spring', stiffness: 380, damping: 32 } as Transition,
  layout: { type: 'spring', stiffness: 210, damping: 30, mass: 1 } as Transition,
  /** Playful pop for the kids' games. */
  bouncy: { type: 'spring', stiffness: 300, damping: 14 } as Transition,
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: duration.slow, ease: ease.out } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: duration.base, ease: ease.out } },
};

export const stagger = (gap = 0.08, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: gap, delayChildren: delay } },
});

export const settleIn: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.96, rotateX: 8 },
  show: { opacity: 1, y: 0, scale: 1, rotateX: 0, transition: spring.settle },
};
