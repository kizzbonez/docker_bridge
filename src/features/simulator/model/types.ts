import type { MeshPatch } from '@/mock-bridge/types';
import type { Tone } from '@/shared/lib/tone';

export const SCENARIO_IDS = ['gateway-502', 'redis-oom', 'db-connection'] as const;
export type ScenarioId = (typeof SCENARIO_IDS)[number];

export type StepKind = 'prompt' | 'thought' | 'call' | 'result' | 'diff' | 'verdict';

/** One line group in the agent terminal. `text` is streamed character by character. */
export interface Step {
  kind: StepKind;
  text: string;
  /** Tool name for calls, file path for diffs. */
  label?: string;
  /** Applied to the mesh once this step has finished streaming. */
  mesh?: MeshPatch;
}

export interface Scenario {
  id: ScenarioId;
  button: string;
  tone: Tone;
  /** What breaks the moment the scenario is triggered. */
  incident: MeshPatch;
  /** The healthy state after the proposed fix is applied. */
  fix: MeshPatch;
  steps: Step[];
}

export type PlaybackStatus = 'idle' | 'running' | 'done' | 'resolved';
