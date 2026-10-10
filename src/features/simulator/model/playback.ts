import { SCENARIOS } from './scenarios';
import type { PlaybackStatus, ScenarioId, Step, StepKind } from './types';

/** Where the terminal is: which scenario, which step, how many characters in. */
export interface Playback {
  scenarioId: ScenarioId | null;
  stepIndex: number;
  chars: number;
  resolved: boolean;
}

export type PlaybackAction =
  | { type: 'start'; scenarioId: ScenarioId; instant: boolean }
  | { type: 'tick' }
  | { type: 'skip' }
  | { type: 'apply-fix' }
  | { type: 'reset' };

export const IDLE: Playback = { scenarioId: null, stepIndex: 0, chars: 0, resolved: false };

export const TICK_MS = 24;

/** Characters revealed per tick: people type slowly, JSON arrives in bursts. */
export const CHARS_PER_TICK: Record<StepKind, number> = {
  prompt: 2,
  thought: 4,
  call: 14,
  result: 22,
  diff: 10,
  verdict: 5,
};

/** Delay before a step starts streaming: thinking time or tool latency. */
export const PAUSE_MS: Record<StepKind, number> = {
  prompt: 250,
  thought: 450,
  call: 300,
  result: 520,
  diff: 480,
  verdict: 400,
};

export function stepsOf(playback: Playback): Step[] {
  return playback.scenarioId ? SCENARIOS[playback.scenarioId].steps : [];
}

export function statusOf(playback: Playback): PlaybackStatus {
  if (!playback.scenarioId) return 'idle';
  if (playback.resolved) return 'resolved';
  return playback.stepIndex >= stepsOf(playback).length ? 'done' : 'running';
}

function tick(state: Playback): Playback {
  const step = stepsOf(state)[state.stepIndex];
  if (!step) return state;
  const chars = state.chars + CHARS_PER_TICK[step.kind];
  if (chars < step.text.length) return { ...state, chars };
  return { ...state, stepIndex: state.stepIndex + 1, chars: 0 };
}

export function playbackReducer(state: Playback, action: PlaybackAction): Playback {
  switch (action.type) {
    case 'start': {
      const stepIndex = action.instant ? SCENARIOS[action.scenarioId].steps.length : 0;
      return { scenarioId: action.scenarioId, stepIndex, chars: 0, resolved: false };
    }
    case 'tick':
      return tick(state);
    case 'skip':
      return { ...state, stepIndex: stepsOf(state).length, chars: 0 };
    case 'apply-fix':
      return statusOf(state) === 'done' ? { ...state, resolved: true } : state;
    case 'reset':
      return IDLE;
  }
}
