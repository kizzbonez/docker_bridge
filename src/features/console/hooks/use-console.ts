import { useCallback, useState } from 'react';
import { consoleApi, isFailure, type ActivityView, type EngineSummary, type ToolReply, type Topology } from '../model/console-api';
import { usePolling, type Polled } from './use-polling';

const ENGINE_EVERY_MS = 10_000;
const ACTIVITY_EVERY_MS = 10_000;
/** A topology with metrics makes the engine sample each container's CPU, so it is asked for less often. */
const TOPOLOGY_EVERY_MS = 8_000;

export const useEngine = (): Polled<EngineSummary> => usePolling(consoleApi.engine, ENGINE_EVERY_MS);

export const useActivity = (): Polled<ActivityView> => usePolling(consoleApi.activity, ACTIVITY_EVERY_MS);

export interface LiveTopology {
  topology: Topology | null;
  /** Why there is nothing to show: the tool's own message, or a failed request. */
  problem: string | null;
  refresh: () => void;
}

function unpack(reply: ToolReply<Topology> | null, error: string | null): Pick<LiveTopology, 'topology' | 'problem'> {
  if (reply === null) return { topology: null, problem: error };
  if (isFailure(reply.structured)) return { topology: null, problem: reply.structured.error };
  return { topology: reply.structured, problem: error };
}

const readTopology = (project: string | null, metrics: boolean): Promise<ToolReply<Topology>> =>
  consoleApi.call<Topology>('docker_get_stack_topology', { project: project ?? '', include_metrics: metrics, include_stopped: true });

/**
 * The selected project's topology. Metrics take the engine a second or two
 * to sample, so the first answer is asked for without them and the cards
 * appear at once; the full reading replaces it, and is refreshed while `live`.
 */
export function useTopology(project: string | null, live: boolean): LiveTopology {
  const quick = useCallback(() => readTopology(project, false), [project]);
  const full = useCallback(() => readTopology(project, true), [project]);
  const first = usePolling(quick, null, project !== null);
  const polled = usePolling(full, live ? TOPOLOGY_EVERY_MS : null, project !== null);
  return { ...unpack(polled.data ?? first.data, polled.error ?? first.error), refresh: polled.refresh };
}

/** A sensible first project: one that is running and is not the console's own stack. */
function defaultProject(engine: EngineSummary | null): string | null {
  if (!engine?.reachable) return null;
  const others = engine.projects.filter((project) => project.name !== engine.bridge.selfProject);
  return (others.find((project) => project.running > 0) ?? others[0] ?? engine.projects[0])?.name ?? null;
}

type Choice = [current: string | null, choose: (name: string) => void];

/**
 * Which compose project the page is looking at. A choice that no longer
 * exists (the stack was removed) falls back to a default by itself.
 */
export function useProjectChoice(engine: EngineSummary | null): Choice {
  const [chosen, choose] = useState<string | null>(null);
  const names = engine?.reachable ? engine.projects.map((project) => project.name) : [];
  return [chosen !== null && names.includes(chosen) ? chosen : defaultProject(engine), choose];
}

/** Which service of the topology on screen is being inspected; the first one until told otherwise. */
export function useServiceChoice(topology: Topology | null): Choice {
  const [chosen, choose] = useState<string | null>(null);
  const names = topology?.services.map((service) => service.name) ?? [];
  return [chosen !== null && names.includes(chosen) ? chosen : (names[0] ?? null), choose];
}
