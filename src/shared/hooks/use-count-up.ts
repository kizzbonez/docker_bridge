import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './use-reduced-motion';

const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

/**
 * Animates towards `target` once `active`, re-animating from the current
 * value whenever the target changes. Reduced motion jumps straight there.
 */
export function useCountUp(target: number, active: boolean, durationMs = 1100): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    if (!active || reduced) return;
    const from = latest.current;
    const startedAt = performance.now();
    let frame = 0;
    const step = (now: number): void => {
      const progress = Math.min(1, (now - startedAt) / durationMs);
      latest.current = from + (target - from) * easeOutCubic(progress);
      setValue(latest.current);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, active, reduced, durationMs]);

  return reduced ? target : value;
}
