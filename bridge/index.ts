// DockerBridge MCP server.
//
// Speaks the Model Context Protocol over stdio and answers three tools by
// talking to the local Docker Engine. Runs straight from source: Node strips
// the types, so there is no build step and nothing to install.
//
//   node bridge/index.ts
//
// Environment:
//   READ_ONLY_MODE          "false" to allow state-changing exec commands (default: read-only)
//   DOCKER_SOCKET_PATH      unix socket or named pipe (default: the platform's Docker socket)
//   DOCKER_BRIDGE_PROJECTS  comma-separated compose projects to limit every tool to
//   DOCKER_BRIDGE_ACTIVITY  "off" to stop recording tool calls (default: data/activity/ in this repository)
//
// stdout carries the protocol and nothing else. Diagnostics go to stderr.
import { join } from 'node:path';
import { activityDirFrom, createActivityLog } from './activity/log.ts';
import { toRecord } from './activity/record.ts';
import { loadConfig } from './config.ts';
import { createEngine } from './docker/engine.ts';
import { createDispatcher } from './mcp/protocol.ts';
import { serveStdio } from './mcp/stdio.ts';
import { createTools } from './tools/registry.ts';
import { NAME, VERSION } from './version.ts';

const INSTRUCTIONS = [
  'Debugs containers on the local Docker Engine with bounded, sanitised output.',
  'Start with docker_get_stack_topology to see which service is failing and how.',
  'Then use docker_tail_filtered_logs with a narrow filter_pattern rather than reading whole logs.',
  'docker_safe_exec runs allowlisted read-only diagnostics; a refusal explains which rule applied.',
].join(' ');

const log = (line: string): void => void process.stderr.write(`[${NAME}] ${line}\n`);

const config = loadConfig(process.env);
const engine = createEngine(config.socketPath, { timeoutMs: config.requestTimeoutMs, maxBytes: 4 * 1024 * 1024 });
const tools = createTools({ engine, config });

// Who called what, and how it went: read by the web console. Never the output.
const activityDir = activityDirFrom(process.env, join(import.meta.dirname, '..', 'data', 'activity'));
const activity = createActivityLog(activityDir);
const dispatch = createDispatcher({ name: NAME, version: VERSION, instructions: INSTRUCTIONS }, tools, log, (report, client) =>
  activity.append(toRecord(report, client, new Date())),
);

const scope = config.projects ? `projects: ${config.projects.join(', ')}` : 'all containers';
log(`v${VERSION} ready · ${config.readOnly ? 'read-only' : 'READ_ONLY_MODE=false'} · ${scope} · ${config.socketPath}`);

await serveStdio(dispatch, process.stdin, process.stdout);
await activity.flush();
