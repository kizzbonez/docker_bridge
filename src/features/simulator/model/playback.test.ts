import { describe, expect, it } from 'vitest';
import { BASELINE_MESH } from '@/mock-bridge/fleet';
import { TOOL_NAMES } from '@bridge/core/tool-specs';
import { CONTAINER_IDS } from '@/mock-bridge/types';
import { deriveMesh, jitterMesh } from './derive-mesh';
import { CHARS_PER_TICK, IDLE, playbackReducer, statusOf, stepsOf, type Playback } from './playback';
import { SCENARIOS } from './scenarios';
import { SCENARIO_IDS } from './types';

const start = (scenarioId: (typeof SCENARIO_IDS)[number], instant = false): Playback =>
  playbackReducer(IDLE, { type: 'start', scenarioId, instant });

describe('playbackReducer', () => {
  it('starts idle and stays idle on tick', () => {
    expect(statusOf(IDLE)).toBe('idle');
    expect(playbackReducer(IDLE, { type: 'tick' })).toBe(IDLE);
  });

  it('streams a step a few characters per tick, then moves on', () => {
    let state = start('gateway-502');
    const first = stepsOf(state)[0];
    expect(first?.kind).toBe('prompt');
    state = playbackReducer(state, { type: 'tick' });
    expect(state).toMatchObject({ stepIndex: 0, chars: CHARS_PER_TICK.prompt });
    const ticks = Math.ceil((first?.text.length ?? 0) / CHARS_PER_TICK.prompt);
    for (let i = 1; i < ticks; i += 1) state = playbackReducer(state, { type: 'tick' });
    expect(state).toMatchObject({ stepIndex: 1, chars: 0 });
  });

  it('reaches done by ticking, and only then accepts the fix', () => {
    let state = start('db-connection');
    expect(playbackReducer(state, { type: 'apply-fix' }).resolved).toBe(false);
    for (let i = 0; i < 5000 && statusOf(state) === 'running'; i += 1) state = playbackReducer(state, { type: 'tick' });
    expect(statusOf(state)).toBe('done');
    expect(statusOf(playbackReducer(state, { type: 'apply-fix' }))).toBe('resolved');
  });

  it('skips to the end, starts instantly under reduced motion, and resets', () => {
    expect(statusOf(playbackReducer(start('redis-oom'), { type: 'skip' }))).toBe('done');
    expect(statusOf(start('redis-oom', true))).toBe('done');
    expect(playbackReducer(start('redis-oom'), { type: 'reset' })).toBe(IDLE);
  });

  it('restarting replaces the previous run', () => {
    const resolved = playbackReducer(start('redis-oom', true), { type: 'apply-fix' });
    expect(playbackReducer(resolved, { type: 'start', scenarioId: 'gateway-502', instant: false })).toEqual({
      scenarioId: 'gateway-502',
      stepIndex: 0,
      chars: 0,
      resolved: false,
    });
  });
});

describe('scenarios', () => {
  it.each(SCENARIO_IDS)('%s opens with a prompt and closes with a verdict', (id) => {
    const { steps } = SCENARIOS[id];
    expect(steps[0]?.kind).toBe('prompt');
    expect(steps.at(-1)?.kind).toBe('verdict');
    expect(steps.at(-1)?.text).toMatch(/\d+ tool calls · ≈ \d+ tokens/);
    expect(steps.some((step) => step.kind === 'diff')).toBe(true);
  });

  it.each(SCENARIO_IDS)('%s pairs every tool call with a valid JSON-RPC result', (id) => {
    const { steps } = SCENARIOS[id];
    steps.forEach((step, index) => {
      if (step.kind !== 'call') return;
      const request = JSON.parse(step.text);
      const response = JSON.parse(steps[index + 1]?.text ?? '');
      expect(TOOL_NAMES).toContain(request.params.name);
      expect(request).toMatchObject({ jsonrpc: '2.0', method: 'tools/call' });
      expect(response).toMatchObject({ jsonrpc: '2.0', id: request.id, result: { isError: false } });
    });
  });

  it('uses the two tools named in the brief for the outage scenarios', () => {
    for (const id of ['gateway-502', 'redis-oom'] as const) {
      const tools = SCENARIOS[id].steps.map((step) => step.label);
      expect(tools).toContain('docker_get_stack_topology');
      expect(tools).toContain('docker_tail_filtered_logs');
    }
  });
});

describe('deriveMesh', () => {
  it('is the healthy baseline when idle', () => {
    expect(deriveMesh(null, 0, false)).toBe(BASELINE_MESH);
  });

  it('applies the OOM incident the moment the scenario starts', () => {
    const mesh = deriveMesh('redis-oom', 0, false);
    expect(mesh.containers['cache-redis']).toMatchObject({ health: 'restarting', exitCode: 137, exitReason: 'OOMKilled', restarts: 4 });
    expect(mesh.links['api-redis']).toBe('broken');
    expect(mesh.containers['web-gateway'].health).toBe('healthy');
  });

  it('applies step patches as the investigation progresses', () => {
    const total = SCENARIOS['redis-oom'].steps.length;
    expect(deriveMesh('redis-oom', total, false).containers['cache-redis'].restarts).toBe(5);
  });

  it.each(SCENARIO_IDS)('%s returns to an all-healthy mesh once the fix is applied', (id) => {
    const mesh = deriveMesh(id, SCENARIOS[id].steps.length, true);
    expect(CONTAINER_IDS.every((container) => mesh.containers[container].health === 'healthy')).toBe(true);
    expect(Object.values(mesh.links).every((state) => state === 'flowing')).toBe(true);
  });

  it('raises the redis memory limit as part of its fix', () => {
    expect(deriveMesh('redis-oom', 0, true).containers['cache-redis'].memLimitMb).toBe(512);
  });
});

describe('jitterMesh', () => {
  it('leaves tick 0 untouched and never moves a dead container', () => {
    expect(jitterMesh(BASELINE_MESH, 0).containers).toEqual(BASELINE_MESH.containers);
    const oom = deriveMesh('redis-oom', 0, false);
    expect(jitterMesh(oom, 9).containers['cache-redis']).toEqual(oom.containers['cache-redis']);
  });

  it('keeps gauges inside their physical limits', () => {
    for (let tick = 1; tick < 100; tick += 1) {
      for (const id of CONTAINER_IDS) {
        const container = jitterMesh(deriveMesh('db-connection', 0, false), tick).containers[id];
        expect(container.cpuPercent).toBeGreaterThanOrEqual(0);
        expect(container.cpuPercent).toBeLessThanOrEqual(100);
        expect(container.memUsedMb).toBeLessThanOrEqual(container.memLimitMb);
      }
    }
  });
});
