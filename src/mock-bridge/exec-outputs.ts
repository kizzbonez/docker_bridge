import type { ContainerId } from './types';

export interface CannedOutput {
  stdout: string;
  durationMs: number;
}

const REDACTED = '«redacted»';

/** Canned stdout for the commands the showcase knows about, per container. */
const OUTPUTS: Record<ContainerId, Record<string, CannedOutput>> = {
  'web-gateway': {
    'nginx -T': {
      stdout: 'upstream order_api {\n    server order-api:8080;\n}\nserver {\n    listen 8443 ssl;\n    location /api/ { proxy_pass http://order_api; }\n}',
      durationMs: 37,
    },
    'cat /etc/nginx/conf.d/upstream.conf': {
      stdout: 'upstream order_api {\n    server order-api:8080;\n}',
      durationMs: 9,
    },
    'nginx -s reload': { stdout: 'signal process started', durationMs: 52 },
  },
  'order-api': {
    'printenv PORT': { stdout: '8081', durationMs: 6 },
    env: {
      stdout: `NODE_ENV=production\nPORT=8081\nDB_POOL_MAX=50\nREDIS_URL=redis://cache-redis:6379\nDATABASE_URL=${REDACTED}\nJWT_SECRET=${REDACTED}`,
      durationMs: 7,
    },
    ps: { stdout: 'PID   USER     COMMAND\n    1 node     node dist/server.js', durationMs: 11 },
  },
  'cache-redis': {
    'redis-cli info memory': {
      stdout: 'used_memory_human:251.84M\nused_memory_peak_human:255.97M\nmaxmemory:0\nmaxmemory_policy:noeviction\nmem_fragmentation_ratio:1.03',
      durationMs: 23,
    },
    'redis-cli config get maxmemory': { stdout: 'maxmemory\n0', durationMs: 19 },
    'redis-cli config set maxmemory 384mb': { stdout: 'OK', durationMs: 21 },
  },
  'db-postgres': {
    'pg_isready -h localhost -p 5432': { stdout: 'localhost:5432 - accepting connections', durationMs: 18 },
    'psql -U postgres -tAc "select count(*) from pg_stat_activity"': { stdout: '97', durationMs: 44 },
    'psql -U postgres -tAc "show max_connections"': { stdout: '100', durationMs: 31 },
    env: {
      stdout: `PGDATA=/var/lib/postgresql/data\nPOSTGRES_DB=orders\nPOSTGRES_USER=orders\nPOSTGRES_PASSWORD=${REDACTED}`,
      durationMs: 7,
    },
  },
};

const FALLBACK: CannedOutput = { stdout: '(simulation: no canned output for this command)', durationMs: 12 };

export function cannedOutput(container: ContainerId, command: string): CannedOutput {
  return OUTPUTS[container][command] ?? FALLBACK;
}

/** Suggested commands for the playground, including ones the guardrails refuse. */
export const EXEC_PRESETS: Record<ContainerId, string[]> = {
  'web-gateway': ['nginx -T', 'nginx -s reload', 'rm -rf /etc/nginx'],
  'order-api': ['printenv PORT', 'env', 'sleep 30'],
  'cache-redis': ['redis-cli info memory', 'redis-cli config set maxmemory 384mb', 'redis-cli flushall'],
  'db-postgres': [
    'pg_isready -h localhost -p 5432',
    'psql -U postgres -tAc "select count(*) from pg_stat_activity"',
    'psql -U postgres -c "drop table orders"',
  ],
};
