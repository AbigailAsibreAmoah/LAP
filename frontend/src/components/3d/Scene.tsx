import type { PortraitSpec } from '@laporte/shared';
import { motion, useReducedMotion } from 'motion/react';
import { useId, type ReactNode } from 'react';
import { ease } from '../animations/motion';
import { Portrait, type Expression } from './Portrait';

/**
 * The La Porte doorway: an arched portal whose two leaves swing open in 3D,
 * spilling warm light — the brand's symbol of access to new opportunities.
 */
export function PortalDoor({ open, width = 260 }: { open: boolean; width?: number }) {
  const uid = useId().replace(/:/g, '');
  const reduce = useReducedMotion();
  const h = width * 1.32;
  const leaf = { duration: reduce ? 0 : 1.6, ease: ease.inOut };
  return (
    <div style={{ position: 'relative', width, height: h, perspective: 900, transformStyle: 'preserve-3d' }} aria-hidden>
      {/* light pool on the floor */}
      <motion.div
        style={{ position: 'absolute', left: '-40%', right: '-40%', bottom: -h * 0.08, height: h * 0.22, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(242,205,140,0.75), rgba(242,205,140,0) 70%)', filter: 'blur(6px)' }}
        initial={{ opacity: 0, scaleX: 0.4 }}
        animate={{ opacity: open ? 1 : 0, scaleX: open ? 1 : 0.4 }}
        transition={{ duration: 1.6, delay: open ? 0.5 : 0, ease: ease.out }}
      />
      <svg viewBox="0 0 260 344" width={width} height={h} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <defs>
          <linearGradient id={`frame-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2A3460" />
            <stop offset="100%" stopColor="#0E1328" />
          </linearGradient>
          <radialGradient id={`light-${uid}`} cx="50%" cy="78%" r="80%">
            <stop offset="0%" stopColor="#FFF6E2" />
            <stop offset="40%" stopColor="#F2CD8C" />
            <stop offset="100%" stopColor="#C9874A" />
          </radialGradient>
          <filter id={`glow-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>
        {/* outer architectural frame */}
        <path d="M14 344V128C14 62 66 14 130 14s116 48 116 114v216z" fill={`url(#frame-${uid})`} />
        <path d="M14 344V128C14 62 66 14 130 14s116 48 116 114v216" fill="none" stroke="#C49A5A" strokeWidth="1.5" opacity=".55" />
        {/* reveal / depth of the wall */}
        <path d="M34 344V132c0-54 43-98 96-98s96 44 96 98v212z" fill="#0A0E1F" />
        {/* light beyond the door */}
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: open ? 1 : 0.15 }} transition={{ duration: 1.2, delay: open ? 0.3 : 0 }}>
          <path d="M44 344V136c0-48 38-88 86-88s86 40 86 88v208z" fill={`url(#light-${uid})`} />
          <ellipse cx="130" cy="250" rx="70" ry="90" fill="#FFF3DA" opacity=".7" filter={`url(#glow-${uid})`} />
          {/* distant horizon inside the doorway */}
          <path d="M44 286c30-14 58-18 86-12s58 4 86-8v78H44z" fill="#E4B57A" opacity=".55" />
        </motion.g>
        {/* keystone */}
        <path d="M120 14h20l-4 24h-12z" fill="#C49A5A" />
      </svg>
      {/* door leaves swing open in 3D */}
      {(['left', 'right'] as const).map((side) => (
        <motion.div
          key={side}
          style={{
            position: 'absolute',
            bottom: 0,
            [side]: `${(44 / 260) * 100}%`,
            width: `${(86 / 260) * 100}%`,
            height: `${(296 / 344) * 100}%`,
            transformOrigin: side === 'left' ? 'left center' : 'right center',
            borderRadius: side === 'left' ? `${width * 0.33}px 0 0 0` : `0 ${width * 0.33}px 0 0`,
            background: 'linear-gradient(160deg, #8A2340 0%, #6E1630 55%, #4A0E21 100%)',
            boxShadow: 'inset 0 0 0 1px rgba(196,154,90,0.35), inset 0 -40px 60px rgba(0,0,0,0.25)',
            backfaceVisibility: 'hidden',
          }}
          initial={{ rotateY: 0 }}
          animate={{ rotateY: open ? (side === 'left' ? -78 : 78) : 0 }}
          transition={leaf}
        >
          <div style={{ position: 'absolute', inset: '14% 16% 10%', borderRadius: side === 'left' ? '60% 0 6px 6px / 30% 0 6px 6px' : '0 60% 6px 6px / 0 30% 6px 6px', border: '1px solid rgba(196,154,90,0.4)' }} />
          <span style={{ position: 'absolute', top: '56%', [side === 'left' ? 'right' : 'left']: 10, width: 6, height: 18, borderRadius: 3, background: '#D8B26E' }} />
        </motion.div>
      ))}
    </div>
  );
}

const backdrops = {
  meeting: { wall: ['#3B3F6E', '#6B5E8E', '#C9A3A8'], floor: '#2A2B4A', desk: 'linear-gradient(180deg, #5A4636 0%, #3A2C22 100%)' },
  trade: { wall: ['#8B4B3A', '#C2805A', '#F0C58E'], floor: '#5E3326', desk: 'linear-gradient(180deg, #E9DCC8 0%, #CBB79A 100%)' },
  travel: { wall: ['#7FA6C9', '#E8C9A0', '#F6E3C4'], floor: '#B98A5E', desk: 'linear-gradient(180deg, #9C6B45 0%, #6E4A30 100%)' },
} as const;

export type SceneKind = keyof typeof backdrops;

/** A small illustrated environment with a character — one learner's world. */
export function LearnerScene({ kind, spec, expression = 'smile', accessory, children, className }: { kind: SceneKind; spec: PortraitSpec; expression?: Expression; accessory?: 'headphones'; children?: ReactNode; className?: string }) {
  const uid = useId().replace(/:/g, '');
  const b = backdrops[kind];
  return (
    <div className={className} style={{ position: 'relative', overflow: 'hidden', borderRadius: 'inherit', height: '100%' }}>
      <svg viewBox="0 0 240 300" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden>
        <defs>
          <linearGradient id={`wall-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={b.wall[0]} />
            <stop offset="60%" stopColor={b.wall[1]} />
            <stop offset="100%" stopColor={b.wall[2]} />
          </linearGradient>
          <radialGradient id={`sun-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFF4D6" />
            <stop offset="100%" stopColor="#FFF4D6" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="240" height="300" fill={`url(#wall-${uid})`} />
        {kind === 'meeting' && (
          <g>
            <rect x="130" y="30" width="90" height="150" rx="4" fill="#1E2244" opacity=".55" />
            <g fill="#F1D3A0" opacity=".75">
              {[140, 156, 172, 188, 204].map((x, i) => (
                <rect key={x} x={x} y={120 - (i % 3) * 22} width="10" height={60 + (i % 3) * 22} />
              ))}
            </g>
            <path d="M130 105h90M175 30v150" stroke="#C9A3A8" strokeWidth="3" opacity=".6" />
            <circle cx="60" cy="70" r="40" fill={`url(#sun-${uid})`} opacity=".5" />
          </g>
        )}
        {kind === 'trade' && (
          <g>
            {[20, 95, 170].map((x) => (
              <path key={x} d={`M${x} 200V90a30 30 0 0 1 60 0v110z`} fill="#6E3526" opacity=".35" />
            ))}
            <g fill="#2F5D3A" opacity=".75">
              <path d="M18 300c0-50 10-80 30-110-4 40 0 70 8 110z" />
              <path d="M40 300c4-40 18-70 40-90-10 30-12 60-12 90z" />
            </g>
          </g>
        )}
        {kind === 'travel' && (
          <g>
            <circle cx="180" cy="70" r="48" fill={`url(#sun-${uid})`} />
            <path d="M0 200c40-20 80-26 120-18s80 6 120-10v128H0z" fill="#D9A877" opacity=".6" />
            <path d="M150 210V120a34 34 0 0 1 68 0v90" fill="none" stroke="#FFFFFF" strokeWidth="5" opacity=".55" />
          </g>
        )}
        <rect y="248" width="240" height="52" fill={b.floor} opacity=".35" />
      </svg>
      <div style={{ position: 'absolute', left: '6%', right: '6%', bottom: '13%', aspectRatio: '1 / 1' }}>
        <Portrait spec={spec} expression={expression} framed={false} accessory={accessory} />
      </div>
      {/* foreground desk: seats the character and adds a near depth layer */}
      <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '15%', background: b.desk, boxShadow: '0 -10px 24px -8px rgba(0,0,0,.35)' }}>
        <span style={{ position: 'absolute', inset: '0 0 auto', height: 3, background: 'rgba(255,255,255,.35)' }} />
        <span style={{ position: 'absolute', right: '14%', top: -14, width: 16, height: 16, borderRadius: '2px 2px 6px 6px', background: '#F3EEE6', boxShadow: 'inset -3px 0 0 rgba(0,0,0,.08)' }} />
      </div>
      {children}
    </div>
  );
}
