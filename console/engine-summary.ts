import { listContainers, type ContainerRef } from '../bridge/docker/containers.ts';
import { callJson } from '../bridge/docker/engine.ts';
import { ToolError } from '../bridge/errors.ts';
import { VERSION } from '../bridge/version.ts';
import type { ConsoleContext } from './context.ts';

interface EngineInfo {
  ServerVersion?: string;
  OperatingSystem?: string;
  NCPU?: number;
  MemTotal?: number;
}

export interface ProjectSummary {
  name: string;
  total: number;
  running: number;
}

const MIB = 1024 * 1024;

function projectsOf(containers: ContainerRef[]): ProjectSummary[] {
  const byName = new Map<string, ProjectSummary>();
  for (const container of containers) {
    if (container.project === null) continue;
    const entry = byName.get(container.project) ?? { name: container.project, total: 0, running: 0 };
    entry.total += 1;
    if (container.state === 'running') entry.running += 1;
    byName.set(container.project, entry);
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** How the bridge inside the console is configured. Shown whether or not the engine answers. */
async function bridgeOf(ctx: ConsoleContext): Promise<Record<string, unknown>> {
  const self = await ctx.self();
  return {
    version: VERSION,
    readOnly: ctx.config.bridge.readOnly,
    scope: ctx.config.bridge.projects,
    execEnabled: ctx.config.execEnabled,
    selfProject: self.status === 'known' ? self.project : null,
  };
}

/**
 * The header of the console: is the engine there, what is on it, and how the
 * bridge is set up. An unreachable engine is an answer, not an error.
 */
export async function engineSummary(ctx: ConsoleContext): Promise<Record<string, unknown>> {
  try {
    const [info, containers] = await Promise.all([callJson<EngineInfo>(ctx.access.engine, 'GET', '/info'), listContainers(ctx.access)]);
    return {
      reachable: true,
      engine: {
        version: info.ServerVersion ?? 'unknown',
        os: info.OperatingSystem ?? 'unknown',
        cpus: info.NCPU ?? 0,
        memoryMib: Math.round((info.MemTotal ?? 0) / MIB),
      },
      // Counted from the containers the bridge may see, which a project scope narrows.
      containers: { total: containers.length, running: containers.filter((container) => container.state === 'running').length },
      projects: projectsOf(containers),
      standalone: containers.filter((container) => container.project === null).length,
      bridge: await bridgeOf(ctx),
    };
  } catch (error) {
    if (!(error instanceof ToolError)) throw error;
    return { reachable: false, error: error.message, bridge: await bridgeOf(ctx) };
  }
}
