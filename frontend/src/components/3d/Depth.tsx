import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { useRef, type CSSProperties, type ReactNode } from 'react';

/**
 * Card with restrained pointer-driven tilt and a moving specular highlight.
 * Disabled for touch and reduced-motion users; content stays crisp (no blur, no 3D text).
 */
export function TiltCard({ children, className, style, max = 6 }: { children: ReactNode; className?: string; style?: CSSProperties; max?: number }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rx = useSpring(useTransform(py, [0, 1], [max, -max]), { stiffness: 200, damping: 22 });
  const ry = useSpring(useTransform(px, [0, 1], [-max, max]), { stiffness: 200, damping: 22 });
  const glare = useTransform([px, py], ([x, y]: number[]) => `radial-gradient(420px circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.35), transparent 45%)`);

  if (reduce) return <div className={className} style={style}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ ...style, rotateX: rx, rotateY: ry, transformPerspective: 1000, transformStyle: 'preserve-3d' }}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse' || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width);
        py.set((e.clientY - r.top) / r.height);
      }}
      onPointerLeave={() => {
        px.set(0.5);
        py.set(0.5);
      }}
    >
      {children}
      <motion.div aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: glare, pointerEvents: 'none', mixBlendMode: 'soft-light' }} />
    </motion.div>
  );
}

/** Animated voice waveform. `active` drives the bars; otherwise it rests as a calm line. */
export function Waveform({ active, still, bars = 28, color = 'var(--burgundy)', height = 44 }: { active: boolean; still?: boolean; bars?: number; color?: string; height?: number }) {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden style={{ display: 'flex', alignItems: 'center', gap: 3, height }}>
      {Array.from({ length: bars }, (_, i) => {
        // Deterministic envelope so the shape reads as speech, not noise.
        const env = 0.35 + 0.65 * Math.abs(Math.sin(i * 0.55) * Math.cos(i * 0.21));
        return (
          <motion.span
            key={i}
            style={{ width: 3, borderRadius: 3, background: color, height: '100%', originY: 0.5 }}
            initial={{ scaleY: 0.12 }}
            animate={
              active && !reduce
                ? { scaleY: [0.15, env, 0.25 + env * 0.4, env * 0.8, 0.15] }
                : { scaleY: active || still ? env * (still && !active ? 0.6 : 1) : 0.12 }
            }
            transition={active && !reduce ? { duration: 1.1 + (i % 5) * 0.12, repeat: Infinity, ease: 'easeInOut', delay: i * 0.025 } : { duration: 0.4 }}
          />
        );
      })}
    </div>
  );
}

/** Dimensional progress ring: gradient stroke, inner bevel and soft drop shadow. */
export function ProgressRing({
  value,
  size = 120,
  stroke = 10,
  label,
  sub,
  dark,
  delay = 0.2,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: ReactNode;
  sub?: ReactNode;
  dark?: boolean;
  delay?: number;
}) {
  const id = useRef(`ring-${Math.random().toString(36).slice(2, 8)}`).current;
  const r = (size - stroke) / 2 - 4;
  return (
    <div style={{ position: 'relative', width: size, height: size, filter: 'drop-shadow(0 10px 18px rgba(20,27,52,0.22))' }} role="img" aria-label={`${value}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#E7C78F" />
            <stop offset="55%" stopColor="#C49A5A" />
            <stop offset="100%" stopColor="#8E6630" />
          </linearGradient>
          <radialGradient id={`${id}-face`} cx="35%" cy="30%" r="80%">
            <stop offset="0%" stopColor={dark ? '#2B355F' : '#FFFFFF'} />
            <stop offset="100%" stopColor={dark ? '#141B34' : '#F1E8DA'} />
          </radialGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r + stroke / 2 + 2} fill={`url(#${id}-face)`} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={dark ? 'rgba(255,255,255,0.1)' : 'rgba(20,27,52,0.08)'} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: value / 100 }}
          transition={{ duration: 1.4, delay, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center', alignContent: 'center' }}>
        {label && <div style={{ fontFamily: 'var(--font-display)', fontSize: size * 0.26, fontWeight: 700, lineHeight: 1, color: dark ? '#fff' : 'var(--navy)' }}>{label}</div>}
        {sub && <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4, color: dark ? 'rgba(243,238,230,.7)' : 'var(--muted)' }}>{sub}</div>}
      </div>
    </div>
  );
}

/** Tactile achievement token — a minted coin with an engraved icon. */
export function Token({ children, size = 44, state = 'earned' }: { children: ReactNode; size?: number; state?: 'earned' | 'active' | 'locked' }) {
  const faces = {
    earned: 'radial-gradient(circle at 35% 30%, #F6E2B8 0%, #D4AE6B 45%, #9C7536 100%)',
    active: 'radial-gradient(circle at 35% 30%, #FFFFFF 0%, #F0E7DA 60%, #D8CBB6 100%)',
    locked: 'radial-gradient(circle at 35% 30%, #F4EFE7 0%, #E4DACB 100%)',
  };
  return (
    <span
      style={{
        display: 'inline-grid',
        placeItems: 'center',
        flex: 'none',
        width: size,
        height: size,
        borderRadius: '50%',
        background: faces[state],
        color: state === 'earned' ? '#4A3412' : state === 'active' ? 'var(--burgundy)' : '#A69C8D',
        boxShadow:
          state === 'locked'
            ? 'inset 0 1px 0 rgba(255,255,255,.7), 0 2px 0 #CFC3B0'
            : 'inset 0 1px 1px rgba(255,255,255,.8), inset 0 -2px 3px rgba(0,0,0,.18), 0 3px 0 ' + (state === 'earned' ? '#86612A' : '#C9BBA4') + ', 0 10px 18px -6px rgba(20,27,52,.4)',
      }}
    >
      {children}
    </span>
  );
}
