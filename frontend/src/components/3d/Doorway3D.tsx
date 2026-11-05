import { motion } from 'motion/react';
import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import type { DoorwayVariant } from './DoorwayScene';
import { PortalDoor } from './Scene';

const DoorwayScene = lazy(() => import('./DoorwayScene'));

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Falls back to the illustrated door if the GPU context fails at runtime. */
class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** How long the 3D door stays visibly closed before it opens. */
const CLOSED_BEAT_MS = 650;

/**
 * La Porte's real-time 3D doorway, opening onto Paris. The stage stays empty while
 * three.js loads, then the door fades in closed and opens. The illustrated SVG door is
 * only for browsers where WebGL is unavailable or fails.
 */
export function Doorway3D({ open, still, variant = 'room', fallbackWidth = 260 }: { open: boolean; still: boolean; variant?: DoorwayVariant; fallbackWidth?: number }) {
  const [webgl] = useState(hasWebGL);
  const [ready, setReady] = useState(false);
  const [settled, setSettled] = useState(still);
  const fallback = (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
      <PortalDoor open={open} width={fallbackWidth} />
    </div>
  );

  useEffect(() => {
    if (!ready || settled) return;
    const id = window.setTimeout(() => setSettled(true), CLOSED_BEAT_MS);
    return () => window.clearTimeout(id);
  }, [ready, settled]);

  if (!webgl) return fallback;

  const opening = open && settled;
  return (
    <SceneBoundary fallback={fallback}>
      <Suspense fallback={null}>
        <motion.div style={{ position: 'absolute', inset: 0 }} initial={{ opacity: 0 }} animate={{ opacity: ready ? 1 : 0 }} transition={{ duration: still ? 0 : 0.6 }}>
          {variant === 'standalone' && (
            // light pool on the floor, spilling out as the leaves open
            <motion.div
              style={{ position: 'absolute', left: '0%', right: '0%', bottom: '2%', height: '16%', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(242,205,140,0.7), rgba(242,205,140,0) 70%)', filter: 'blur(6px)' }}
              initial={{ opacity: 0, scaleX: 0.4 }}
              animate={{ opacity: opening ? 1 : 0, scaleX: opening ? 1 : 0.4 }}
              transition={{ duration: still ? 0 : 1.6, delay: opening && !still ? 0.5 : 0 }}
            />
          )}
          <DoorwayScene open={opening} still={still} variant={variant} onReady={() => setReady(true)} />
        </motion.div>
      </Suspense>
    </SceneBoundary>
  );
}
