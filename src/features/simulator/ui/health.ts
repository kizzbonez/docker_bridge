import type { ContainerState, Health, LinkState } from '@/mock-bridge/types';
import type { Tone } from '@/shared/lib/tone';

export const HEALTH_TONE: Record<Health, Tone> = {
  healthy: 'ok',
  degraded: 'warn',
  restarting: 'crit',
  exited: 'crit',
};

export const LINK_TONE: Record<LinkState, Tone> = {
  flowing: 'signal',
  degraded: 'warn',
  broken: 'crit',
};

export function cpuTone(percent: number): Tone {
  if (percent >= 85) return 'crit';
  return percent >= 60 ? 'warn' : 'signal';
}

export function memoryTone(container: ContainerState): Tone {
  const ratio = container.memUsedMb / container.memLimitMb;
  if (ratio >= 0.95) return 'crit';
  return ratio >= 0.8 ? 'warn' : 'signal';
}
