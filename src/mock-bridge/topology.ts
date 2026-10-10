import { LINK_ENDS } from './fleet';
import { CONTAINER_IDS, LINK_IDS, type ContainerState, type MeshState } from './types';

export interface TopologyArgs {
  project: string;
  include_metrics: boolean;
  include_stopped: boolean;
}

function summarize(container: ContainerState, withMetrics: boolean): Record<string, unknown> {
  const service: Record<string, unknown> = {
    name: container.id,
    image: container.image,
    health: container.health,
    restarts: container.restarts,
  };
  if (container.exitCode !== null) {
    service.last_exit = { code: container.exitCode, reason: container.exitReason };
  }
  if (withMetrics) {
    service.cpu_percent = container.cpuPercent;
    service.memory_mib = { used: container.memUsedMb, limit: container.memLimitMb };
  }
  return service;
}

/** Mock of `docker_get_stack_topology`: one compact graph instead of N CLI calls. */
export function getStackTopology(mesh: MeshState, args: TopologyArgs): Record<string, unknown> {
  const visible = CONTAINER_IDS.map((id) => mesh.containers[id]).filter(
    (container) => args.include_stopped || container.health !== 'exited',
  );
  return {
    project: args.project,
    services: visible.map((container) => summarize(container, args.include_metrics)),
    edges: LINK_IDS.map((id) => ({ from: LINK_ENDS[id][0], to: LINK_ENDS[id][1], state: mesh.links[id] })),
    unhealthy: visible.filter((container) => container.health !== 'healthy').map((container) => container.id),
  };
}
