import { buildTopology, type ServiceInfo } from '../core/topology.ts';
import { listContainers, type ContainerRef, type EngineAccess } from '../docker/containers.ts';
import { inspectContainer, readUsage } from '../docker/inspect.ts';
import { ToolError } from '../errors.ts';

export interface TopologyArgs {
  project: string;
  include_metrics: boolean;
  include_stopped: boolean;
}

const MIB = 1024 * 1024;

/** The compose service name, unless the service is scaled and names would collide. */
function namer(members: ContainerRef[]): (container: ContainerRef) => string {
  const counts = new Map<string, number>();
  for (const member of members) {
    if (member.service) counts.set(member.service, (counts.get(member.service) ?? 0) + 1);
  }
  return (container) => (container.service && counts.get(container.service) === 1 ? container.service : container.name);
}

async function describeService(access: EngineAccess, container: ContainerRef, name: string, withMetrics: boolean): Promise<ServiceInfo> {
  const details = await inspectContainer(access.engine, container.id);
  const service: ServiceInfo = {
    name,
    image: container.image,
    health: details.health,
    restarts: details.restarts,
    lastExit: details.lastExit,
  };
  if (!withMetrics || container.state !== 'running') return service;
  const usage = await readUsage(access.engine, container.id);
  if (!usage) return service;
  const limit = details.memoryLimit > 0 ? Math.round(details.memoryLimit / MIB) : null;
  return { ...service, metrics: { cpuPercent: usage.cpuPercent, memoryUsedMib: usage.memoryUsedMib, memoryLimitMib: limit } };
}

function unknownProject(project: string, visible: ContainerRef[]): ToolError {
  const known = [...new Set(visible.map((container) => container.project).filter((name) => name !== null))].sort();
  return new ToolError(`no containers found for compose project "${project}". Known projects: ${known.join(', ') || 'none'}`);
}

/** `docker_get_stack_topology` against a live engine. */
export async function stackTopology(access: EngineAccess, args: TopologyArgs): Promise<Record<string, unknown>> {
  const visible = await listContainers(access);
  const members = visible.filter((container) => container.project === args.project);
  if (members.length === 0) throw unknownProject(args.project, visible);

  const nameOf = namer(members);
  const shown = members.filter((container) => args.include_stopped || container.state === 'running');
  const services = await Promise.all(
    shown.map((container) => describeService(access, container, nameOf(container), args.include_metrics)),
  );

  const present = new Set(shown.map((container) => container.service ?? container.name));
  const edges = shown.flatMap((container) =>
    container.dependsOn.filter((target) => present.has(target)).map((target) => ({ from: nameOf(container), to: target })),
  );
  return buildTopology(args.project, services, edges);
}
