import type { ContainerId, LinkId, MeshState } from './types';

export const PROJECT = 'shop';

/** The healthy steady state of the simulated compose stack. */
export const BASELINE_MESH: MeshState = {
  containers: {
    'web-gateway': {
      id: 'web-gateway',
      image: 'nginx:1.29-alpine',
      role: 'edge proxy',
      ports: '443 → 8443',
      cpuPercent: 4,
      memUsedMb: 38,
      memLimitMb: 128,
      health: 'healthy',
      restarts: 0,
      uptime: '6d 4h',
      exitCode: null,
      exitReason: null,
      dependsOn: ['order-api'],
    },
    'order-api': {
      id: 'order-api',
      image: 'shop/order-api:2.14.0',
      role: 'node service',
      ports: '8080',
      cpuPercent: 18,
      memUsedMb: 212,
      memLimitMb: 512,
      health: 'healthy',
      restarts: 0,
      uptime: '2h 11m',
      exitCode: null,
      exitReason: null,
      dependsOn: ['cache-redis', 'db-postgres'],
    },
    'cache-redis': {
      id: 'cache-redis',
      image: 'redis:7.4-alpine',
      role: 'cache',
      ports: '6379',
      cpuPercent: 6,
      memUsedMb: 142,
      memLimitMb: 256,
      health: 'healthy',
      restarts: 0,
      uptime: '6d 4h',
      exitCode: null,
      exitReason: null,
      dependsOn: [],
    },
    'db-postgres': {
      id: 'db-postgres',
      image: 'postgres:17-alpine',
      role: 'primary database',
      ports: '5432',
      cpuPercent: 11,
      memUsedMb: 388,
      memLimitMb: 1024,
      health: 'healthy',
      restarts: 0,
      uptime: '6d 4h',
      exitCode: null,
      exitReason: null,
      dependsOn: [],
    },
  },
  links: { 'gateway-api': 'flowing', 'api-redis': 'flowing', 'api-postgres': 'flowing' },
};

export const LINK_ENDS: Record<LinkId, [ContainerId, ContainerId]> = {
  'gateway-api': ['web-gateway', 'order-api'],
  'api-redis': ['order-api', 'cache-redis'],
  'api-postgres': ['order-api', 'db-postgres'],
};
