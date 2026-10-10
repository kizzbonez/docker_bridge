import { paint } from '@/shared/lib/ansi';
import { clock } from './clock';

const stamp = (i: number): string => paint(90, `${clock(i)}.${String((i * 37) % 1000).padStart(3, '0')}`);
const level = { debug: paint(36, 'DEBUG'), info: paint(32, 'INFO '), warn: paint(33, 'WARN '), error: paint(31, 'ERROR') };

const BOOT = [
  `${level.info} boot: order-api 2.14.0 (node 24.9.0)`,
  `${level.info} config: PORT=8081 DB_POOL_MAX=50 REDIS_URL=redis://cache-redis:6379`,
  `${level.info} http: listening on 0.0.0.0:8081`,
];

const health = (i: number): string => `${level.debug} http: GET /healthz 200 ${1 + (i % 3)}ms`;
const order = (i: number): string => `${level.info} http: GET /api/orders/${9900 + i} 200 ${12 + (i % 9)}ms`;
const redisDown = (i: number): string =>
  `${level.error} cache: connect ECONNREFUSED cache-redis:6379 (retry ${(i % 5) + 1}/5)`;
const cacheBypass = (): string => `${level.warn} cache: bypassing cache, reading order:summary from postgres`;
const poolTimeout = (i: number): string =>
  `${level.error} pg-pool: timeout acquiring client after 5000ms (max=50 idle=0 waiting=${30 + (i % 9)})`;
const tooManyClients = (): string => `${level.error} pg: FATAL: sorry, too many clients already`;

function messageAt(i: number): string {
  const boot = BOOT[i];
  if (boot !== undefined) return boot;
  if (i % 11 === 5) return redisDown(i);
  if (i % 11 === 6) return cacheBypass();
  if (i % 13 === 9) return poolTimeout(i);
  if (i % 13 === 10) return tooManyClients();
  return i % 3 === 0 ? order(i) : health(i);
}

/** Node service: boot banner, request noise, cache and pool errors mixed in. */
export const ORDER_API_LOG: string[] = Array.from({ length: 110 }, (_, i) => `${stamp(i)} ${messageAt(i)}`);
