import type { BridgeConfig } from '../config.ts';
import { InvalidParams, ToolError } from '../errors.ts';
import { callJson, type Engine } from './engine.ts';

const PROJECT_LABEL = 'com.docker.compose.project';
const SERVICE_LABEL = 'com.docker.compose.service';
const DEPENDS_LABEL = 'com.docker.compose.depends_on';

// Ids come from the engine, but they end up in request paths: check anyway.
const CONTAINER_ID = /^[a-f0-9]{12,64}$/;
const CONTAINER_NAME = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/;

interface ListedContainer {
  Id: string;
  Names: string[] | null;
  Image: string;
  State: string;
  Labels: Record<string, string> | null;
}

export interface ContainerRef {
  id: string;
  name: string;
  service: string | null;
  project: string | null;
  state: string;
  image: string;
  /** Compose services this one declares it depends on. */
  dependsOn: string[];
}

export interface EngineAccess {
  engine: Engine;
  config: BridgeConfig;
}

// "db:service_healthy:false,cache:service_started:false" -> ["db", "cache"]
const dependencies = (label: string | undefined): string[] =>
  (label ?? '')
    .split(',')
    .map((entry) => entry.split(':')[0]?.trim() ?? '')
    .filter((name) => name !== '');

function toRef(listed: ListedContainer): ContainerRef | null {
  if (!CONTAINER_ID.test(listed.Id)) return null;
  const labels = listed.Labels ?? {};
  return {
    id: listed.Id,
    name: (listed.Names?.[0] ?? listed.Id.slice(0, 12)).replace(/^\//, ''),
    service: labels[SERVICE_LABEL] ?? null,
    project: labels[PROJECT_LABEL] ?? null,
    state: listed.State,
    image: listed.Image,
    dependsOn: dependencies(labels[DEPENDS_LABEL]),
  };
}

/** Every container the bridge is allowed to see. All tools go through this. */
export async function listContainers({ engine, config }: EngineAccess): Promise<ContainerRef[]> {
  const listed = await callJson<ListedContainer[]>(engine, 'GET', '/containers/json?all=true');
  const refs = listed.map(toRef).filter((ref): ref is ContainerRef => ref !== null);
  const allowed = config.projects;
  return allowed ? refs.filter((ref) => ref.project !== null && allowed.includes(ref.project)) : refs;
}

function describe(containers: ContainerRef[]): string {
  const names = containers.slice(0, 15).map((container) => container.name);
  return names.length > 0 ? names.join(', ') : 'none';
}

/**
 * Finds one container by exact name, id, or compose service. The answer comes
 * from the engine's own list, so a caller-supplied string never reaches a
 * request path.
 */
export async function findContainer(access: EngineAccess, wanted: string, project?: string): Promise<ContainerRef> {
  if (!CONTAINER_NAME.test(wanted)) throw new InvalidParams('"container" is not a valid service or container name');
  const visible = await listContainers(access);
  const scope = project === undefined ? visible : visible.filter((container) => container.project === project);

  const exact = scope.filter((container) => container.name === wanted || (wanted.length >= 12 && container.id.startsWith(wanted)));
  const matches = exact.length > 0 ? exact : scope.filter((container) => container.service === wanted);
  const [match] = matches;
  if (!match) throw new ToolError(`no container named "${wanted}". Visible containers: ${describe(scope)}`);
  if (matches.length > 1) {
    const where = [...new Set(matches.map((container) => container.project ?? 'no project'))].join(', ');
    throw new ToolError(`"${wanted}" matches ${matches.length} containers (${where}). Pass "project" or use the container name.`);
  }
  return match;
}
