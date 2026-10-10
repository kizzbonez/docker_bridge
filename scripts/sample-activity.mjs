// A believable activity log for the throwaway stacks used by the browser
// tests and the screenshots: what a few different MCP clients might have asked
// the bridge for. Times are relative to now, so the console shows "2 min ago".
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MINUTE = 60_000;

const CALLS = [
  [182, 'gemini-cli 0.9.1', 'docker_safe_exec', 'shop/cache-redis', 'redis-cli info memory', 'ok', 118, null, 164],
  [41, 'codex-cli 0.48.0', 'docker_tail_filtered_logs', 'shop/cache-redis', 'OOM|killed', 'ok', 74, 6100, 190],
  [40, 'codex-cli 0.48.0', 'docker_get_stack_topology', 'blog', '', 'error', 21, null, 34],
  [14, 'cursor-vscode 1.9.2', 'docker_tail_filtered_logs', 'shop/web-gateway', '502|upstream', 'ok', 88, 9200, 288],
  [13, 'cursor-vscode 1.9.2', 'docker_safe_exec', 'shop/web-gateway', 'nginx -s reload', 'refused', 1, null, 71],
  [3, 'claude-code 2.1.288', 'docker_get_stack_topology', 'shop', '', 'ok', 1840, null, 212],
  [2, 'claude-code 2.1.288', 'docker_tail_filtered_logs', 'shop/order-api', 'error|timeout|refused', 'ok', 96, 18400, 320],
  [1, 'claude-code 2.1.288', 'docker_safe_exec', 'shop/db-postgres', 'pg_isready -h localhost -p 5432', 'ok', 143, null, 58],
];

/** What the console should report for the sample: used by the tests' assertions. */
export const SAMPLE_TOTALS = { calls: 8, refused: 1, failed: 1, saved: 32_902, clients: 4 };

/** Writes the sample log into `dir`, creating it. Returns `dir`. */
export function writeSampleActivity(dir) {
  const now = Date.now();
  const lines = CALLS.map(([minutesAgo, client, tool, target, detail, outcome, ms, raw, returned]) =>
    JSON.stringify({ at: new Date(now - minutesAgo * MINUTE).toISOString(), client, tool, target, detail, outcome, ms, tokens: { raw, returned } }),
  );
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'calls.jsonl'), `${lines.join('\n')}\n`);
  return dir;
}
