/** One service as the topology tool reports it, whatever produced the data. */
export interface ServiceInfo {
  name: string;
  image: string;
  health: string;
  restarts: number;
  lastExit: { code: number; reason: string | null } | null;
  /** Present only when metrics were requested and could be read. */
  metrics?: { cpuPercent: number; memoryUsedMib: number; memoryLimitMib: number | null };
}

export interface EdgeInfo {
  from: string;
  to: string;
  /** Link condition, when the source can tell. */
  state?: string;
}

/** Health values that do not count as a problem. */
const FINE = new Set(['healthy', 'running', 'starting', 'completed']);

function describe(service: ServiceInfo): Record<string, unknown> {
  const entry: Record<string, unknown> = {
    name: service.name,
    image: service.image,
    health: service.health,
    restarts: service.restarts,
  };
  if (service.lastExit) entry.last_exit = service.lastExit;
  if (service.metrics) {
    entry.cpu_percent = service.metrics.cpuPercent;
    entry.memory_mib = { used: service.metrics.memoryUsedMib, limit: service.metrics.memoryLimitMib };
  }
  return entry;
}

/** The response shape of `docker_get_stack_topology`. */
export function buildTopology(project: string, services: ServiceInfo[], edges: EdgeInfo[]): Record<string, unknown> {
  return {
    project,
    services: services.map(describe),
    edges,
    unhealthy: services.filter((service) => !FINE.has(service.health)).map((service) => service.name),
  };
}
