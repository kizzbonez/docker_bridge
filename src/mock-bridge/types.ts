export const CONTAINER_IDS = ['web-gateway', 'order-api', 'cache-redis', 'db-postgres'] as const;
export type ContainerId = (typeof CONTAINER_IDS)[number];

export type Health = 'healthy' | 'degraded' | 'restarting' | 'exited';

export interface ContainerState {
  id: ContainerId;
  image: string;
  role: string;
  ports: string;
  cpuPercent: number;
  memUsedMb: number;
  memLimitMb: number;
  health: Health;
  restarts: number;
  uptime: string;
  exitCode: number | null;
  exitReason: string | null;
  dependsOn: ContainerId[];
}

export const LINK_IDS = ['gateway-api', 'api-redis', 'api-postgres'] as const;
export type LinkId = (typeof LINK_IDS)[number];
export type LinkState = 'flowing' | 'degraded' | 'broken';

export interface MeshState {
  containers: Record<ContainerId, ContainerState>;
  links: Record<LinkId, LinkState>;
}

/** A sparse change set applied on top of a MeshState. */
export interface MeshPatch {
  containers?: Partial<Record<ContainerId, Partial<ContainerState>>>;
  links?: Partial<Record<LinkId, LinkState>>;
}
