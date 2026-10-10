import { BASELINE_MESH } from '@/mock-bridge/fleet';
import { applyPatch } from '@/mock-bridge/mesh';
import type { MeshPatch } from '@/mock-bridge/types';
import { diff, execExchange, logsExchange, prompt, thought, toolUsage, topologyExchange, verdict } from './steps';
import type { Scenario, Step } from './types';

// The kernel OOM killer takes redis out; every cache miss then lands on postgres.
const incident: MeshPatch = {
  containers: {
    'cache-redis': {
      health: 'restarting',
      cpuPercent: 0,
      memUsedMb: 256,
      restarts: 4,
      uptime: '11s',
      exitCode: 137,
      exitReason: 'OOMKilled',
    },
    'order-api': { health: 'degraded', cpuPercent: 54 },
    'db-postgres': { cpuPercent: 37 },
  },
  links: { 'api-redis': 'broken', 'api-postgres': 'degraded' },
};

const PATCH = `--- a/docker-compose.yml
+++ b/docker-compose.yml
@@ -31,6 +31,9 @@ services:
   cache-redis:
     image: redis:7.4-alpine
-    mem_limit: 256m
+    mem_limit: 512m
+    command: >
+      redis-server --maxmemory 384mb
+      --maxmemory-policy allkeys-lru
     restart: unless-stopped`;

const investigation: Step[] = [
  prompt('Checkout latency tripled and cache-redis keeps flapping. What is going on?'),
  thought('Topology first: it shows which container is failing and how, before I read a single log line.'),
  ...topologyExchange(1, applyPatch(BASELINE_MESH, incident)),
  thought(
    'cache-redis exited with code 137, reason OOMKilled: four restarts, memory pinned at its 256 MiB limit. order-api is degraded because every cache miss now hits postgres. I only want the lines around each kill.',
  ),
  ...logsExchange(2, {
    container: 'cache-redis',
    filter_pattern: 'starting|saving|overcommit',
    tail_lines: 80,
    strip_ansi: true,
    token_budget: 320,
  }),
  thought(
    'Every boot ends the same way: a background save starts, then the log just stops. The fork copies pages on write and pushes RSS past the cgroup limit. Does redis have any memory cap of its own?',
    { containers: { 'cache-redis': { restarts: 5, uptime: '3s' } } },
  ),
  ...execExchange(3, { container: 'cache-redis', command: 'redis-cli config get maxmemory', timeout_ms: 2000 }),
  thought('maxmemory is 0: unbounded. Redis grows until the kernel stops it. Cap it below a raised container limit.'),
  diff('docker-compose.yml', PATCH),
];

export const REDIS_OOM: Scenario = {
  id: 'redis-oom',
  button: 'Simulate Redis OOM Crash',
  tone: 'crit',
  incident,
  fix: { containers: { 'cache-redis': { memLimitMb: 512, memUsedMb: 148 } } },
  steps: [
    ...investigation,
    verdict(
      'Root cause: cache-redis has no maxmemory, so it fills its 256 MiB cgroup; each BGSAVE fork tips it over and the kernel kills it (exit 137, OOMKilled).\n' +
        `Fix drafted as PR "fix(redis): cap maxmemory below a raised mem_limit".\n${toolUsage(investigation)}`,
    ),
  ],
};
