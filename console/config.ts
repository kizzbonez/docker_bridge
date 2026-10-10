import { loadConfig, type BridgeConfig } from '../bridge/config.ts';

export interface ConsoleConfig {
  host: string;
  port: number;
  /**
   * The auth service, asked "is this cookie a session?" on every request.
   * Null skips the check: for running from source in development only.
   */
  authUrl: string | null;
  /** Where the MCP server's activity log is mounted, if it is. */
  activityDir: string | null;
  /** `docker_safe_exec` from the browser. Off leaves the console read-only. */
  execEnabled: boolean;
  /** This container's id, used to find the stack the console must not exec into. */
  selfId: string | null;
  bridge: BridgeConfig;
}

type Env = Record<string, string | undefined>;

const CONTAINER_ID = /^[a-f0-9]{12,64}$/;

const text = (value: string | undefined): string | null => (value && value.trim() !== '' ? value.trim() : null);

function port(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed < 65536 ? parsed : fallback;
}

/** On unless explicitly switched off. */
const enabled = (value: string | undefined): boolean => !/^(false|0|no|off)$/i.test((value ?? '').trim());

export function loadConsoleConfig(env: Env, platform: string = process.platform): ConsoleConfig {
  const hostname = text(env.HOSTNAME);
  return {
    host: env.CONSOLE_HOST ?? '0.0.0.0',
    port: port(env.CONSOLE_PORT, 8082),
    authUrl: text(env.AUTH_URL)?.replace(/\/+$/, '') ?? null,
    activityDir: text(env.DOCKER_BRIDGE_ACTIVITY_DIR),
    execEnabled: enabled(env.CONSOLE_EXEC),
    // Inside a container the hostname is the container id. Anything else is not one.
    selfId: hostname && CONTAINER_ID.test(hostname) ? hostname : null,
    bridge: loadConfig(env, platform),
  };
}
