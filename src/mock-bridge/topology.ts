import { buildTopology, type ServiceInfo } from '@bridge/core/topology';
import { LINK_ENDS } from './fleet';
import { CONTAINER_IDS, LINK_IDS, type ContainerState, type MeshState } from './types';

export interface TopologyArgs {
  project: string;
  include_metrics: boolean;
  include_stopped: boolean;
}

function toService(container: ContainerState, withMetrics: boolean): ServiceInfo {
  return {
    name: container.id,
    image: container.image,
    health: container.health,
    restarts: container.restarts,
    lastExit: container.exitCode === null ? null : { code: container.exitCode, reason: container.exitReason },
    metrics: withMetrics
      ? { cpuPercent: container.cpuPercent, memoryUsedMib: container.memUsedMb, memoryLimitMib: container.memLimitMb }
      : undefined,
  };
}

/** Simulated `docker_get_stack_topology`: the real response shape, built from the mesh. */
export function getStackTopology(mesh: MeshState, args: TopologyArgs): Record<string, unknown> {
  const visible = CONTAINER_IDS.map((id) => mesh.containers[id]).filter(
    (container) => args.include_stopped || container.health !== 'exited',
  );
  const edges = LINK_IDS.map((id) => ({ from: LINK_ENDS[id][0], to: LINK_ENDS[id][1], state: mesh.links[id] }));
  return buildTopology(
    args.project,
    visible.map((container) => toService(container, args.include_metrics)),
    edges,
  );
}
