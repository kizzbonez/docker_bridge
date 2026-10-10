/**
 * Deterministic pseudo-noise in [-1, 1] for a (tick, salt) pair. Used to make
 * simulated gauges wander without Math.random(), so the same tick always
 * renders the same reading.
 */
export function noise(tick: number, salt: number): number {
  const raw = Math.sin(tick * 12.9898 + salt * 78.233) * 43758.5453;
  return (raw - Math.floor(raw)) * 2 - 1;
}
