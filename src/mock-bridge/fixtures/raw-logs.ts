import type { ContainerId } from '../types';
import { CACHE_REDIS_LOG } from './log-cache-redis';
import { DB_POSTGRES_LOG } from './log-db-postgres';
import { ORDER_API_LOG } from './log-order-api';
import { WEB_GATEWAY_LOG } from './log-web-gateway';

/** What `docker logs <container>` would dump, ANSI escapes and all. */
export const RAW_LOGS: Record<ContainerId, string[]> = {
  'web-gateway': WEB_GATEWAY_LOG,
  'order-api': ORDER_API_LOG,
  'cache-redis': CACHE_REDIS_LOG,
  'db-postgres': DB_POSTGRES_LOG,
};
