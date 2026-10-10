import { useEffect, useState } from 'react';
import { useReducedMotion } from './use-reduced-motion';

/**
 * A counter that increments every `intervalMs`. Components derive "live"
 * readings from it with pure noise, so renders stay deterministic per tick.
 * Stays at 0 when the visitor prefers reduced motion.
 */
export function usePulse(intervalMs: number): number {
  const reduced = useReducedMotion();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setTick((value) => value + 1), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, reduced]);

  return tick;
}
