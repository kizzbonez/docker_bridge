import { useCallback, useEffect, useMemo, useReducer } from 'react';
import type { MeshState } from '@/mock-bridge/types';
import { useReducedMotion } from '@/shared/hooks/use-reduced-motion';
import { deriveMesh } from '../model/derive-mesh';
import { IDLE, PAUSE_MS, TICK_MS, playbackReducer, statusOf, stepsOf, type Playback } from '../model/playback';
import type { PlaybackStatus, ScenarioId, Step } from '../model/types';

export interface Simulator {
  playback: Playback;
  status: PlaybackStatus;
  steps: Step[];
  mesh: MeshState;
  start: (scenarioId: ScenarioId) => void;
  skip: () => void;
  applyFix: () => void;
  reset: () => void;
}

/** Drives the agent terminal and derives the container mesh from its progress. */
export function useSimulator(): Simulator {
  const reduced = useReducedMotion();
  const [playback, dispatch] = useReducer(playbackReducer, IDLE);
  const { scenarioId, stepIndex, resolved } = playback;
  const steps = stepsOf(playback);
  const activeKind = steps[stepIndex]?.kind;

  // Each step waits (thinking time / tool latency), then streams on an interval.
  useEffect(() => {
    if (activeKind === undefined) return;
    let interval: number | undefined;
    const pause = window.setTimeout(() => {
      interval = window.setInterval(() => dispatch({ type: 'tick' }), TICK_MS);
    }, PAUSE_MS[activeKind]);
    return () => {
      window.clearTimeout(pause);
      window.clearInterval(interval);
    };
  }, [activeKind, scenarioId, stepIndex]);

  const mesh = useMemo(() => deriveMesh(scenarioId, stepIndex, resolved), [scenarioId, stepIndex, resolved]);
  const start = useCallback((id: ScenarioId) => dispatch({ type: 'start', scenarioId: id, instant: reduced }), [reduced]);
  const skip = useCallback(() => dispatch({ type: 'skip' }), []);
  const applyFix = useCallback(() => dispatch({ type: 'apply-fix' }), []);
  const reset = useCallback(() => dispatch({ type: 'reset' }), []);

  return { playback, status: statusOf(playback), steps, mesh, start, skip, applyFix, reset };
}
