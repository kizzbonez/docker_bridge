// The live console's API.
//
// Serves the bridge's three tools over HTTP to the signed-in administrator,
// plus a summary of the engine and the record of what agents have called.
// It holds the Docker socket, so it publishes no port: nginx forwards /api/
// to it after checking the session, and it checks the session again itself.
//
//   node console/server.ts
//
// Environment:
//   AUTH_URL                    the auth service; unset skips the session check (development only)
//   READ_ONLY_MODE              "false" to allow state-changing exec commands (default: read-only)
//   CONSOLE_EXEC                "false" to refuse every exec from the browser
//   DOCKER_BRIDGE_PROJECTS      comma-separated compose projects to limit the console to
//   DOCKER_BRIDGE_ACTIVITY_DIR  where the MCP server's activity log is mounted
import { closeOnSignal } from '../auth/http.ts';
import { VERSION } from '../bridge/version.ts';
import { createApp } from './app.ts';
import { loadConsoleConfig } from './config.ts';
import { createContext } from './context.ts';

const say = (fields: Record<string, unknown>): void => console.log(JSON.stringify(fields));

const config = loadConsoleConfig(process.env);
const ctx = createContext(config, (line) => console.log(line));

if (config.authUrl === null) {
  say({ level: 'warn', message: 'AUTH_URL is not set: the session check is OFF. Never run like this behind a published port.' });
}

const server = createApp(ctx);
server.listen(config.port, config.host, () => {
  say({
    level: 'info',
    message: 'console service listening',
    port: config.port,
    version: VERSION,
    readOnly: config.bridge.readOnly,
    exec: config.execEnabled,
    scope: config.bridge.projects ?? 'all containers',
  });
});

closeOnSignal(server);
