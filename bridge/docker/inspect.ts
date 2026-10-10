import { callJson, type Engine } from './engine.ts';

interface InspectResponse {
  RestartCount?: number;
  Config?: { Tty?: boolean };
  HostConfig?: { Memory?: number };
  State?: {
    Status?: string;
    Restarting?: boolean;
    OOMKilled?: boolean;
    ExitCode?: number;
    Error?: string;
    Health?: { Status?: string };
  };
}

export interface ContainerDetails {
  health: string;
  restarts: number;
  lastExit: { code: number; reason: string | null } | null;
  /** Without a TTY the log stream is multiplexed and must be demuxed. */
  tty: boolean;
  /** Configured memory limit in bytes; 0 means unlimited. */
  memoryLimit: number;
}

type State = NonNullable<InspectResponse['State']>;

/**
 * One word for how a container is doing. A one-shot container that exited
 * cleanly is "completed", not a failure.
 */
export function healthOf(state: State): string {
  const status = state.Status ?? 'unknown';
  if (state.Restarting || status === 'restarting') return 'restarting';
  if (status === 'running') return state.Health?.Status ?? 'running';
  if (status === 'exited') return state.ExitCode === 0 && !state.OOMKilled ? 'completed' : 'exited';
  return status;
}

function lastExitOf(state: State): ContainerDetails['lastExit'] {
  if (state.Status === 'running' && !state.Restarting) return null;
  const code = state.ExitCode ?? 0;
  if (code === 0 && !state.OOMKilled) return null;
  return { code, reason: state.OOMKilled ? 'OOMKilled' : state.Error || null };
}

export async function inspectContainer(engine: Engine, id: string): Promise<ContainerDetails> {
  const info = await callJson<InspectResponse>(engine, 'GET', `/containers/${id}/json`);
  const state = info.State ?? {};
  return {
    health: healthOf(state),
    restarts: info.RestartCount ?? 0,
    lastExit: lastExitOf(state),
    tty: info.Config?.Tty ?? false,
    memoryLimit: info.HostConfig?.Memory ?? 0,
  };
}

interface StatsResponse {
  cpu_stats?: { cpu_usage?: { total_usage?: number; percpu_usage?: number[] }; system_cpu_usage?: number; online_cpus?: number };
  precpu_stats?: { cpu_usage?: { total_usage?: number }; system_cpu_usage?: number };
  memory_stats?: { usage?: number; stats?: Record<string, number> };
}

export interface Usage {
  cpuPercent: number;
  memoryUsedMib: number;
}

const MIB = 1024 * 1024;
const round1 = (value: number): number => Math.round(value * 10) / 10;

const num = (value: number | undefined): number => value ?? 0;

type CpuStats = NonNullable<StatsResponse['cpu_stats']>;

const coresOf = (cpu: CpuStats): number => cpu.online_cpus ?? cpu.cpu_usage?.percpu_usage?.length ?? 1;

function cpuPercentOf(stats: StatsResponse): number {
  const now: CpuStats = stats.cpu_stats ?? {};
  const before = stats.precpu_stats ?? {};
  const cpuDelta = num(now.cpu_usage?.total_usage) - num(before.cpu_usage?.total_usage);
  const systemDelta = num(now.system_cpu_usage) - num(before.system_cpu_usage);
  if (systemDelta <= 0 || cpuDelta <= 0) return 0;
  return (cpuDelta / systemDelta) * coresOf(now) * 100;
}

function memoryUsedOf(stats: StatsResponse): number {
  const counters = stats.memory_stats?.stats ?? {};
  // Page cache is reclaimable, so it is not counted as use.
  const cache = counters.inactive_file ?? counters.total_inactive_file ?? counters.cache ?? 0;
  return Math.max(0, num(stats.memory_stats?.usage) - cache);
}

/** The same arithmetic `docker stats` uses. */
export function usageFrom(stats: StatsResponse): Usage {
  return { cpuPercent: round1(cpuPercentOf(stats)), memoryUsedMib: Math.round(memoryUsedOf(stats) / MIB) };
}

/** Live CPU and memory. Metrics are best effort: null when they cannot be read. */
export async function readUsage(engine: Engine, id: string): Promise<Usage | null> {
  try {
    // stream=false makes the engine sample twice, which is what CPU % needs.
    return usageFrom(await callJson<StatsResponse>(engine, 'GET', `/containers/${id}/stats?stream=false`, { timeoutMs: 6_000 }));
  } catch {
    return null;
  }
}
