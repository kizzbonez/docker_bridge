export interface BridgeConfig {
  /** Unix socket or Windows named pipe of the Docker Engine. */
  socketPath: string;
  /** When true, docker_safe_exec refuses every state-changing command. */
  readOnly: boolean;
  /** When set, only containers of these compose projects are visible to any tool. */
  projects: string[] | null;
  /** Deadline for ordinary Engine API calls. */
  requestTimeoutMs: number;
}

type Env = Record<string, string | undefined>;

const WINDOWS_PIPE = '//./pipe/docker_engine';
const UNIX_SOCKET = '/var/run/docker.sock';

/** A local socket from DOCKER_HOST. Remote (tcp://, ssh://) engines are deliberately not supported. */
function socketFromDockerHost(value: string | undefined): string | null {
  if (!value) return null;
  if (value.startsWith('unix://')) return value.slice('unix://'.length);
  if (value.startsWith('npipe://')) return value.slice('npipe://'.length);
  return null;
}

const text = (value: string | undefined): string | null => (value && value.trim() !== '' ? value.trim() : null);

/** Read-only unless explicitly switched off. Anything unrecognised stays read-only. */
function readOnly(value: string | undefined): boolean {
  return !/^(false|0|no|off)$/i.test((value ?? '').trim());
}

function projects(value: string | undefined): string[] | null {
  const names = (value ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name !== '');
  return names.length > 0 ? names : null;
}

export function loadConfig(env: Env, platform: string = process.platform): BridgeConfig {
  const fallback = platform === 'win32' ? WINDOWS_PIPE : UNIX_SOCKET;
  return {
    socketPath: text(env.DOCKER_SOCKET_PATH) ?? socketFromDockerHost(env.DOCKER_HOST) ?? fallback,
    readOnly: readOnly(env.READ_ONLY_MODE),
    projects: projects(env.DOCKER_BRIDGE_PROJECTS),
    requestTimeoutMs: 8_000,
  };
}
