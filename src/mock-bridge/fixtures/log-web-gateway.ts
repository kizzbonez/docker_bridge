import { paint } from '@/shared/lib/ansi';
import { clock } from './clock';

const INCIDENT_STARTS_AT = 48;

const stamp = (i: number): string => paint(90, `2026/10/10 ${clock(i)}`);

const probe = (i: number): string =>
  `${stamp(i)} ${paint(32, '[info]')} 172.20.0.1 - "GET /healthz HTTP/1.1" 200 2 "-" "docker-healthcheck"`;

const asset = (i: number): string =>
  `${stamp(i)} ${paint(32, '[info]')} 10.0.3.${i} - "GET /assets/app.6f1c.js HTTP/2.0" 200 48211 "-" "Mozilla/5.0"`;

const refused = (i: number): string =>
  `${stamp(i)} ${paint(31, '[error]')} 31#31: *${4800 + i} connect() failed (111: Connection refused) ` +
  'while connecting to upstream, client: 172.20.0.1, request: "POST /api/orders HTTP/1.1", ' +
  'upstream: "http://order-api:8080/api/orders"';

const badGateway = (i: number): string =>
  `${stamp(i)} ${paint(33, '[warn]')} 10.0.3.${i} - "POST /api/orders HTTP/1.1" 502 157 "-" "shop-web/3.2"`;

function lineAt(i: number): string {
  if (i >= INCIDENT_STARTS_AT && i % 5 === 0) return refused(i);
  if (i >= INCIDENT_STARTS_AT && i % 5 === 1) return badGateway(i);
  return i % 4 === 0 ? asset(i) : probe(i);
}

/** nginx edge proxy: mostly probes and assets, then upstream refusals. */
export const WEB_GATEWAY_LOG: string[] = Array.from({ length: 120 }, (_, i) => lineAt(i));
