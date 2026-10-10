// A disposable copy of the stack for tests and screenshots: its own compose
// project, its own port, a fresh volume (so onboarding runs) and a known
// setup token. It never touches the real `docker-bridge` project or its data.
//
// Its console is limited to the throwaway project itself, so what the tests
// assert on, and what the screenshots show, never depends on (or reveals)
// whatever else is running on this machine.
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

function compose(project, env, ...args) {
  execFileSync('docker', ['compose', '-p', project, ...args], { cwd: ROOT, env, stdio: 'inherit' });
}

export function stopStack(project) {
  compose(project, process.env, 'down', '-v', '--remove-orphans');
}

/**
 * Builds and starts the stack, waiting until every container is healthy.
 * `activityDir` is the folder whose activity log the console should show.
 */
export function startStack({ project, port, activityDir }) {
  const setupToken = (randomBytes(10).toString('hex').match(/.{5}/g) ?? []).join('-').toUpperCase();
  const env = {
    ...process.env,
    DASHBOARD_PORT: String(port),
    AUTH_SETUP_TOKEN: setupToken,
    DOCKER_BRIDGE_PROJECTS: project,
    ACTIVITY_DIR: activityDir,
  };
  compose(project, env, 'down', '-v', '--remove-orphans');
  compose(project, env, 'up', '-d', '--build', '--wait');
  return { baseUrl: `http://127.0.0.1:${port}`, setupToken };
}
