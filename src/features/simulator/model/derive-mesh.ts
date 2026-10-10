import { BASELINE_MESH } from '@/mock-bridge/fleet';
import { applyPatch, applyPatches } from '@/mock-bridge/mesh';
import type { ContainerState, MeshState } from '@/mock-bridge/types';
import { CONTAINER_IDS } from '@/mock-bridge/types';
import { clamp } from '@/shared/lib/format';
import { noise } from '@/shared/lib/noise';
import { SCENARIOS } from './scenarios';
import type { ScenarioId } from './types';

/**
 * The mesh is a pure function of playback: baseline → incident → the patches
 * of every finished step, or baseline → fix once the fix has been applied.
 */
export function deriveMesh(scenarioId: ScenarioId | null, stepIndex: number, resolved: boolean): MeshState {
  if (!scenarioId) return BASELINE_MESH;
  const scenario = SCENARIOS[scenarioId];
  if (resolved) return applyPatch(BASELINE_MESH, scenario.fix);
  const played = scenario.steps.slice(0, stepIndex).map((step) => step.mesh);
  return applyPatches(BASELINE_MESH, [scenario.incident, ...played]);
}

function jitterContainer(container: ContainerState, tick: number, salt: number): ContainerState {
  const running = container.health === 'healthy' || container.health === 'degraded';
  if (!running || tick === 0) return container;
  const cpuSwing = Math.max(1.5, container.cpuPercent * 0.12);
  const cpu = clamp(container.cpuPercent + noise(tick, salt) * cpuSwing, 0, 100);
  const mem = clamp(container.memUsedMb * (1 + noise(tick, salt + 7) * 0.015), 0, container.memLimitMb);
  return { ...container, cpuPercent: Math.round(cpu * 10) / 10, memUsedMb: Math.round(mem) };
}

/** Lets running containers' gauges wander a little, so the mesh reads as live. */
export function jitterMesh(mesh: MeshState, tick: number): MeshState {
  const containers = { ...mesh.containers };
  CONTAINER_IDS.forEach((id, salt) => {
    containers[id] = jitterContainer(mesh.containers[id], tick, salt + 1);
  });
  return { ...mesh, containers };
}
