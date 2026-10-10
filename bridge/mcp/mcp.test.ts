// @vitest-environment node
import { spawn } from 'node:child_process';
import { PassThrough } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { TOOL_NAMES, TOOL_SPECS } from '../core/tool-specs.ts';
import { InvalidParams, ToolError } from '../errors.ts';
import { containerId, startFakeEngine, type FakeEngine } from '../test-support/fake-engine.ts';
import type { Tool } from '../tools/registry.ts';
import { PROTOCOL_VERSIONS, createDispatcher, type JsonRpcResponse } from './protocol.ts';
import { serveStdio } from './stdio.ts';

const INFO = { name: 'docker-debug-bridge', version: '0.0.0-test', instructions: 'test' };
const request = (id: number, method: string, params?: unknown) => ({ jsonrpc: '2.0', id, method, params });

function stubTools(run: Tool['run'] = async (args) => ({ structured: { echoed: args }, isError: false })): Tool[] {
  return TOOL_NAMES.map((name) => ({ spec: TOOL_SPECS[name], run }));
}

describe('protocol', () => {
  it('agrees to the client\'s revision when it speaks it, and offers its newest otherwise', async () => {
    const dispatch = createDispatcher(INFO, stubTools());
    for (const version of PROTOCOL_VERSIONS) {
      const reply = await dispatch(request(1, 'initialize', { protocolVersion: version, capabilities: {} }));
      expect(reply?.result).toMatchObject({ protocolVersion: version, capabilities: { tools: {} }, serverInfo: { name: INFO.name } });
    }
    const future = await dispatch(request(2, 'initialize', { protocolVersion: '2099-01-01' }));
    expect(future?.result).toMatchObject({ protocolVersion: PROTOCOL_VERSIONS[0] });
  });

  it('lists the three tools with closed schemas and honest annotations', async () => {
    const reply = await createDispatcher(INFO, stubTools())(request(1, 'tools/list'));
    const tools = (reply?.result as { tools: Array<Record<string, unknown>> }).tools;
    expect(tools.map((tool) => tool.name)).toEqual([...TOOL_NAMES]);
    for (const tool of tools) {
      expect(tool.inputSchema).toMatchObject({ type: 'object', additionalProperties: false });
      expect(tool.annotations).toMatchObject({ destructiveHint: false, openWorldHint: false });
    }
    expect(tools[2]?.annotations).toMatchObject({ readOnlyHint: false });
  });

  it('returns structured content, mirrored as text, with defaults applied', async () => {
    const reply = await createDispatcher(INFO, stubTools())(request(7, 'tools/call', { name: 'docker_tail_filtered_logs', arguments: { container: 'web' } }));
    const result = reply?.result as { content: Array<{ type: string; text: string }>; structuredContent: unknown; isError: boolean };
    expect(reply?.id).toBe(7);
    expect(result.isError).toBe(false);
    expect(result.structuredContent).toEqual({ echoed: { container: 'web', filter_pattern: '', tail_lines: 200, strip_ansi: true, token_budget: 320 } });
    expect(JSON.parse(result.content[0]?.text ?? '')).toEqual(result.structuredContent);
  });

  it('rejects bad calls as invalid params, before the tool runs', async () => {
    let ran = 0;
    const dispatch = createDispatcher(INFO, stubTools(async () => ({ structured: { ran: (ran += 1) }, isError: false })));
    const bad: unknown[] = [
      { name: 'docker_rm_everything', arguments: {} },
      { name: 'docker_safe_exec', arguments: { container: 'web' } },
      { name: 'docker_safe_exec', arguments: { container: 'web', command: 'ls', force: true } },
      { name: 'docker_tail_filtered_logs', arguments: { container: 'web', tail_lines: 999999 } },
      { arguments: {} },
      'nope',
    ];
    for (const params of bad) {
      const reply = await dispatch(request(1, 'tools/call', params));
      expect(reply?.error?.code, JSON.stringify(params)).toBe(-32602);
    }
    expect(ran).toBe(0);
  });

  it('reports expected tool failures as results and hides unexpected ones', async () => {
    const logged: string[] = [];
    const failing = (error: Error) => createDispatcher(INFO, stubTools(() => Promise.reject(error)), (line) => logged.push(line));
    const call = request(1, 'tools/call', { name: 'docker_get_stack_topology', arguments: { project: 'shop' } });

    const expected = await failing(new ToolError('no containers found'))(call);
    expect(expected?.result).toMatchObject({ isError: true, structuredContent: { error: 'no containers found' } });
    expect((await failing(new InvalidParams('bad pattern'))(call))?.error).toEqual({ code: -32602, message: 'bad pattern' });

    const crash = await failing(new Error('secret internal detail: /var/run/x'))(call);
    expect(crash?.error).toEqual({ code: -32603, message: 'Internal error' });
    expect(logged.join()).toContain('secret internal detail');
  });

  it('answers ping, stays silent on notifications, and refuses everything else', async () => {
    const dispatch = createDispatcher(INFO, stubTools());
    expect(await dispatch(request(1, 'ping'))).toEqual({ jsonrpc: '2.0', id: 1, result: {} });
    expect(await dispatch({ jsonrpc: '2.0', method: 'notifications/initialized' })).toBeNull();
    expect(await dispatch({ jsonrpc: '2.0', method: 'no/such/notification' })).toBeNull();
    expect((await dispatch(request(2, 'resources/list')))?.error?.code).toBe(-32601);
    for (const junk of [null, 42, 'x', [], { id: 1 }, { jsonrpc: '1.0', id: 1, method: 'ping' }]) {
      expect((await dispatch(junk))?.error?.code).toBe(-32600);
    }
  });
});

async function overStdio(lines: string[]): Promise<Array<JsonRpcResponse | JsonRpcResponse[]>> {
  const input = new PassThrough();
  const output = new PassThrough();
  const chunks: Buffer[] = [];
  output.on('data', (chunk: Buffer) => chunks.push(chunk));
  const served = serveStdio(createDispatcher(INFO, stubTools()), input, output);
  input.end(lines.map((line) => `${line}\n`).join(''));
  await served;
  return Buffer.concat(chunks).toString('utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line) as JsonRpcResponse);
}

describe('stdio transport', () => {
  it('reads one message per line and writes one reply per line', async () => {
    const replies = await overStdio([JSON.stringify(request(1, 'ping')), '', JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }), JSON.stringify(request(2, 'ping'))]);
    expect(replies).toEqual([{ jsonrpc: '2.0', id: 1, result: {} }, { jsonrpc: '2.0', id: 2, result: {} }]);
  });

  it('answers malformed JSON with a parse error and keeps serving', async () => {
    const replies = await overStdio(['{not json', JSON.stringify(request(3, 'ping'))]);
    expect(replies[0]).toEqual({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
    expect(replies[1]).toMatchObject({ id: 3 });
  });

  it('answers a batch with a batch', async () => {
    const [batch] = await overStdio([JSON.stringify([request(1, 'ping'), { jsonrpc: '2.0', method: 'notifications/x' }, request(2, 'ping')])]);
    expect(batch).toEqual([{ jsonrpc: '2.0', id: 1, result: {} }, { jsonrpc: '2.0', id: 2, result: {} }]);
  });
});

describe('the real server process', () => {
  let fake: FakeEngine;
  afterEach(() => fake?.close());

  /** Runs `node bridge/index.ts` exactly as Claude Code would, against a fake engine. */
  async function session(messages: unknown[], env: Record<string, string> = {}) {
    fake = await startFakeEngine([
      { id: containerId('web'), name: 'shop-web-1', image: 'nginx:1.30', state: 'running', labels: { 'com.docker.compose.project': 'shop', 'com.docker.compose.service': 'web' }, log: ['[error] upstream refused', 'GET /healthz 200'], exec: () => ({ stdout: 'should never run\n' }) },
    ]);
    const entry = fileURLToPath(new URL('../index.ts', import.meta.url));
    const child = spawn(process.execPath, [entry], { env: { ...process.env, DOCKER_SOCKET_PATH: fake.socketPath, READ_ONLY_MODE: '', ...env } });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => (stdout += chunk.toString('utf8')));
    child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString('utf8')));
    child.stdin.end(messages.map((message) => `${JSON.stringify(message)}\n`).join(''));
    const code = await new Promise<number | null>((resolve) => child.on('close', resolve));
    return { code, stderr, replies: stdout.trim().split('\n').map((line) => JSON.parse(line) as JsonRpcResponse) };
  }

  it('completes a handshake and serves real tool calls over stdio', async () => {
    const { code, stderr, replies } = await session([
      request(1, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } }),
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      request(2, 'tools/list'),
      request(3, 'tools/call', { name: 'docker_tail_filtered_logs', arguments: { container: 'web', filter_pattern: 'error' } }),
      request(4, 'tools/call', { name: 'docker_safe_exec', arguments: { container: 'web', command: 'rm -rf /usr/share/nginx' } }),
    ]);
    expect(code).toBe(0);
    expect(stderr).toContain('read-only');
    const byId = new Map(replies.map((reply) => [reply.id, reply]));
    expect(byId.get(1)?.result).toMatchObject({ protocolVersion: '2025-06-18', serverInfo: { name: 'docker-debug-bridge' } });
    expect((byId.get(2)?.result as { tools: unknown[] }).tools).toHaveLength(3);
    expect(byId.get(3)?.result).toMatchObject({ isError: false, structuredContent: { container: 'shop-web-1', matched_lines: 1 } });
    expect(byId.get(4)?.result).toMatchObject({ isError: true, structuredContent: { allowed: false } });
    expect(fake.execs).toEqual([]);
  }, 20_000);

  it('says so, as a tool result, when the engine cannot be reached', async () => {
    const { replies } = await session([request(1, 'tools/call', { name: 'docker_get_stack_topology', arguments: { project: 'shop' } })], { DOCKER_SOCKET_PATH: '//./pipe/dockerbridge-does-not-exist' });
    expect(replies[0]?.result).toMatchObject({ isError: true, structuredContent: { error: expect.stringContaining('cannot reach the Docker Engine') } });
  }, 20_000);
});
