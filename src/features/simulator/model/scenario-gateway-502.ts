import { BASELINE_MESH } from '@/mock-bridge/fleet';
import { applyPatch } from '@/mock-bridge/mesh';
import type { MeshPatch } from '@/mock-bridge/types';
import { diff, logsExchange, prompt, thought, toolUsage, topologyExchange, verdict } from './steps';
import type { Scenario, Step } from './types';

// Release 2.14.0 moved order-api to :8081; the gateway still proxies to :8080.
const incident: MeshPatch = {
  containers: {
    'web-gateway': { health: 'degraded', cpuPercent: 9 },
    'order-api': { ports: '8081' },
  },
  links: { 'gateway-api': 'broken' },
};

const PATCH = `--- a/nginx/conf.d/upstream.conf
+++ b/nginx/conf.d/upstream.conf
@@ -1,3 +1,3 @@
 upstream order_api {
-    server order-api:8080;
+    server order-api:8081;
 }`;

const investigation: Step[] = [
  prompt('Checkout has been returning 502s since the 2.14.0 deploy. Find out why and propose a fix.'),
  thought(
    'Mapping the stack first. One topology call replaces docker ps, docker inspect and docker stats, at a fraction of the tokens.',
  ),
  ...topologyExchange(1, applyPatch(BASELINE_MESH, incident)),
  thought(
    'web-gateway is degraded and its edge to order-api is broken, yet order-api itself reports healthy. That smells like routing, not a crash. Pulling only the upstream errors from the gateway.',
  ),
  ...logsExchange(2, {
    container: 'web-gateway',
    filter_pattern: 'connect\\(\\) failed',
    tail_lines: 120,
    strip_ansi: true,
    token_budget: 320,
  }),
  thought('Connection refused on order-api:8080, repeated. The service is up, so which port does it actually bind?'),
  ...logsExchange(3, {
    container: 'order-api',
    filter_pattern: 'listening|PORT=',
    tail_lines: 200,
    strip_ansi: true,
    token_budget: 160,
  }),
  thought('There it is: order-api 2.14.0 listens on 8081, while the gateway upstream still points at 8080.'),
  diff('nginx/conf.d/upstream.conf', PATCH),
];

export const GATEWAY_502: Scenario = {
  id: 'gateway-502',
  button: 'Trigger 502 Outage Diagnostic',
  tone: 'warn',
  incident,
  fix: { containers: { 'order-api': { ports: '8081' } } },
  steps: [
    ...investigation,
    verdict(
      'Root cause: port drift. order-api 2.14.0 listens on :8081 but web-gateway proxies to :8080, so every /api call is refused and surfaces as a 502.\n' +
        `Fix drafted as PR "fix(gateway): point order_api upstream at :8081".\n${toolUsage(investigation)}`,
    ),
  ],
};
