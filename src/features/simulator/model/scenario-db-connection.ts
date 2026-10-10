import type { MeshPatch } from '@/mock-bridge/types';
import { diff, execExchange, logsExchange, prompt, thought, toolUsage, verdict } from './steps';
import type { Scenario, Step } from './types';

// Postgres is alive but out of connection slots: the app pool is oversized.
const incident: MeshPatch = {
  containers: {
    'db-postgres': { health: 'degraded', cpuPercent: 71, memUsedMb: 884 },
    'order-api': { health: 'degraded', cpuPercent: 33 },
  },
  links: { 'api-postgres': 'degraded' },
};

const PATCH = `--- a/docker-compose.yml
+++ b/docker-compose.yml
@@ -18,7 +18,8 @@ services:
   order-api:
     environment:
       PORT: "8080"
-      DB_POOL_MAX: "50"
+      DB_POOL_MAX: "20"
+      DB_POOL_IDLE_TIMEOUT_MS: "10000"
     depends_on:`;

const investigation: Step[] = [
  prompt('Run a database connection test. Some order requests time out under load.'),
  thought(
    'Starting with a liveness probe inside the database container. docker_safe_exec only runs allowlisted diagnostics, as argv, with a hard timeout.',
  ),
  ...execExchange(1, { container: 'db-postgres', command: 'pg_isready -h localhost -p 5432', timeout_ms: 2000 }),
  thought('Postgres accepts connections, so it is not down. How close is it to its connection ceiling?'),
  ...execExchange(2, {
    container: 'db-postgres',
    command: 'psql -U postgres -tAc "select count(*) from pg_stat_activity"',
    timeout_ms: 3000,
  }),
  thought('97 backends against a max_connections of 100. Confirming the rejections from the log, FATAL lines only.'),
  ...logsExchange(3, {
    container: 'db-postgres',
    filter_pattern: 'FATAL',
    tail_lines: 90,
    strip_ansi: true,
    token_budget: 320,
  }),
  thought(
    'order-api opens up to DB_POOL_MAX=50 connections per worker and runs two workers: 100 clients competing for 97 usable slots. The pool is simply oversized.',
  ),
  diff('docker-compose.yml', PATCH),
];

export const DB_CONNECTION: Scenario = {
  id: 'db-connection',
  button: 'Run DB Connection Test',
  tone: 'signal',
  incident,
  fix: {},
  steps: [
    ...investigation,
    verdict(
      'Result: the database is reachable, but its connection budget is exhausted: 97 of 100 slots in use and FATAL "too many clients" under load.\n' +
        `Fix drafted as PR "fix(order-api): size the pg pool to the server limit".\n${toolUsage(investigation)}`,
    ),
  ],
};
