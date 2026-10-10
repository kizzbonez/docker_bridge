import { DB_CONNECTION } from './scenario-db-connection';
import { GATEWAY_502 } from './scenario-gateway-502';
import { REDIS_OOM } from './scenario-redis-oom';
import type { Scenario, ScenarioId } from './types';

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  'gateway-502': GATEWAY_502,
  'redis-oom': REDIS_OOM,
  'db-connection': DB_CONNECTION,
};
