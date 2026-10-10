import { describe, expect, it } from 'vitest';
import { BASELINE_MESH } from './fleet';
import { applyPatch, applyPatches } from './mesh';
import { INVALID_PARAMS, rpcCall, rpcError, rpcResult } from './rpc';
import { TOOL_NAMES, TOOL_SPECS } from '@bridge/core/tool-specs';
import { getStackTopology } from './topology';

const args = { project: 'shop', include_metrics: true, include_stopped: true };

describe('applyPatch', () => {
  it('merges container and link changes without mutating the input', () => {
    const patched = applyPatch(BASELINE_MESH, {
      containers: { 'cache-redis': { health: 'restarting', exitCode: 137 } },
      links: { 'api-redis': 'broken' },
    });
    expect(patched.containers['cache-redis']).toMatchObject({ health: 'restarting', exitCode: 137, image: 'redis:7.4-alpine' });
    expect(patched.links).toMatchObject({ 'api-redis': 'broken', 'gateway-api': 'flowing' });
    expect(BASELINE_MESH.containers['cache-redis'].health).toBe('healthy');
    expect(BASELINE_MESH.links['api-redis']).toBe('flowing');
  });

  it('returns the same mesh for an empty patch list', () => {
    expect(applyPatch(BASELINE_MESH, undefined)).toBe(BASELINE_MESH);
    expect(applyPatches(BASELINE_MESH, [undefined, undefined])).toBe(BASELINE_MESH);
  });
});

describe('getStackTopology', () => {
  it('describes every service and edge of the healthy stack', () => {
    const topology = getStackTopology(BASELINE_MESH, args);
    expect(topology.services).toHaveLength(4);
    expect(topology.edges).toHaveLength(3);
    expect(topology.unhealthy).toEqual([]);
  });

  it('reports an OOM-killed container with its exit details', () => {
    const mesh = applyPatch(BASELINE_MESH, {
      containers: { 'cache-redis': { health: 'restarting', exitCode: 137, exitReason: 'OOMKilled' } },
    });
    const topology = getStackTopology(mesh, args);
    expect(topology.unhealthy).toEqual(['cache-redis']);
    expect(JSON.stringify(topology)).toContain('"last_exit":{"code":137,"reason":"OOMKilled"}');
  });

  it('omits metrics and stopped containers on request', () => {
    const mesh = applyPatch(BASELINE_MESH, { containers: { 'db-postgres': { health: 'exited' } } });
    const topology = getStackTopology(mesh, { project: 'shop', include_metrics: false, include_stopped: false });
    expect(topology.services).toHaveLength(3);
    expect(JSON.stringify(topology)).not.toContain('cpu_percent');
  });
});

describe('rpc envelopes', () => {
  it('builds a tools/call request', () => {
    expect(JSON.parse(rpcCall(7, 'docker_safe_exec', { command: 'ls' }))).toEqual({
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: { name: 'docker_safe_exec', arguments: { command: 'ls' } },
    });
  });

  it('builds results and protocol errors', () => {
    expect(JSON.parse(rpcResult(1, { ok: true }))).toEqual({ jsonrpc: '2.0', id: 1, result: { isError: false, structuredContent: { ok: true } } });
    expect(JSON.parse(rpcError(1, INVALID_PARAMS, 'bad'))).toEqual({ jsonrpc: '2.0', id: 1, error: { code: -32602, message: 'bad' } });
  });
});

describe('tool specs', () => {
  it.each(TOOL_NAMES)('%s has a closed schema whose required fields exist', (name) => {
    const { inputSchema } = TOOL_SPECS[name];
    expect(inputSchema.additionalProperties).toBe(false);
    for (const field of inputSchema.required) expect(inputSchema.properties).toHaveProperty(field);
  });

  it('marks only docker_safe_exec as not read-only, and nothing as destructive', () => {
    expect(TOOL_NAMES.filter((name) => !TOOL_SPECS[name].annotations.readOnlyHint)).toEqual(['docker_safe_exec']);
    expect(TOOL_NAMES.some((name) => TOOL_SPECS[name].annotations.destructiveHint)).toBe(false);
  });
});
