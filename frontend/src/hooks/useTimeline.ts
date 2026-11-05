import { useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Deterministic step sequencer for choreographed showcases.
 * `durations[i]` is how long step i holds before advancing (ms).
 * Reduced-motion users start on `restingStep` with playback paused, but can still
 * step through manually — the content stays available, only the autoplay is removed.
 */
export function useTimeline({
  durations,
  loop = false,
  restingStep,
  autoplay = true,
}: {
  durations: number[];
  loop?: boolean;
  restingStep?: number;
  autoplay?: boolean;
}) {
  const reduce = useReducedMotion();
  const last = durations.length - 1;
  const rest = restingStep ?? last;
  const [step, setStep] = useState(reduce ? rest : 0);
  const [playing, setPlaying] = useState(autoplay && !reduce);
  const timer = useRef<number>();

  useEffect(() => {
    if (!playing) return;
    if (step >= last && !loop) {
      setPlaying(false);
      return;
    }
    timer.current = window.setTimeout(() => setStep((s) => (s >= last ? 0 : s + 1)), durations[step]);
    return () => window.clearTimeout(timer.current);
  }, [step, playing, loop, last, durations]);

  // Pause when the tab is hidden so we never burn cycles in the background.
  useEffect(() => {
    const onVis = () => document.hidden && setPlaying(false);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const goTo = useCallback((s: number) => {
    setStep(Math.max(0, Math.min(last, s)));
  }, [last]);

  return {
    step,
    playing,
    reduce: Boolean(reduce),
    play: () => {
      if (step >= last && !loop) setStep(0);
      setPlaying(true);
    },
    pause: () => setPlaying(false),
    replay: () => {
      setStep(0);
      setPlaying(true);
    },
    skip: () => {
      setPlaying(false);
      setStep(rest);
    },
    goTo,
  };
}
