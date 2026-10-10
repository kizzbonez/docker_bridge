/** Operational facts quoted by the docs. Keep in sync with docker-compose.yml and docker/nginx. */
export const DASHBOARD_URL = 'http://127.0.0.1:8742';

export const ENV_VARS: string[][] = [
  [
    'READ_ONLY_MODE',
    'on',
    'docker_safe_exec refuses every command that changes runtime state. Only the exact value "false" (or 0, no, off) turns it off.',
  ],
  [
    'DOCKER_SOCKET_PATH',
    '/var/run/docker.sock, or //./pipe/docker_engine on Windows',
    'Unix socket or named pipe of the local Docker Engine. Remote engines are not supported.',
  ],
  [
    'DOCKER_BRIDGE_PROJECTS',
    'unset: every container',
    'Comma-separated compose projects. When set, no tool can see or touch a container outside them.',
  ],
  [
    'DOCKER_BRIDGE_ACTIVITY',
    'on',
    'Set to "off" to stop the server recording its tool calls. DOCKER_BRIDGE_ACTIVITY_DIR moves the log out of the repository.',
  ],
];

/** Set in .env next to docker-compose.yml; they configure the console container. */
export const CONSOLE_ENV_VARS: string[][] = [
  ['READ_ONLY_MODE', 'true', 'The console refuses every state-changing command, exactly as the MCP server does.'],
  ['CONSOLE_EXEC', 'true', 'Set to false and no command at all can be run from the browser; the console only reads.'],
  ['DOCKER_BRIDGE_PROJECTS', 'unset: every container', 'Comma-separated compose projects. When set, the console sees nothing else.'],
  ['DOCKER_SOCKET_GID', '0', 'The group that owns the Docker socket. 0 suits Docker Desktop; on Linux use the gid of the docker group.'],
  ['ACTIVITY_DIR', './data/activity', 'The folder the MCP server writes its activity log to, mounted read-only.'],
];

export const SECURITY_HEADERS: string[][] = [
  ['Content-Security-Policy', "default-src 'none'; script, style, font and img from 'self' only", 'No inline script or style, no third-party origins, no framing.'],
  ['X-Content-Type-Options', 'nosniff', 'Stops MIME sniffing of scripts and styles.'],
  ['X-Frame-Options', 'DENY', 'Clickjacking defence for browsers without frame-ancestors.'],
  ['Referrer-Policy', 'no-referrer', 'Outbound links leak nothing.'],
  ['Permissions-Policy', 'camera, microphone, geolocation, payment, usb: none', 'Powerful features are switched off.'],
  ['Cross-Origin-Opener-Policy', 'same-origin', 'Isolates the browsing context group.'],
  ['Cross-Origin-Resource-Policy', 'same-origin', 'Assets cannot be embedded by other origins.'],
  ['Cache-Control', 'private on protected files; no-store on sign-in', 'A CDN in front cannot cache protected content and replay it.'],
  ['X-Robots-Tag', 'noindex, nofollow', 'Kept out of search indexes.'],
];

export const NPM_SCRIPTS: string[][] = [
  ['npm run dev', 'Vite dev server on 127.0.0.1 with hot reload.'],
  ['npm run console', 'The console API on port 8082, from source, for the dev server to talk to. No sign-in: development only.'],
  ['npm run bridge', 'The MCP server on stdio, as a client would launch it.'],
  ['npm run verify', 'Typecheck, lint (with size budgets), unit tests and a production build.'],
  ['npm run test', 'Vitest unit and component tests.'],
  ['npm run e2e', 'Starts a throwaway stack, walks through onboarding, then runs the browser, accessibility and header checks.'],
  ['npm run screenshots', 'Regenerates the images used in the tour and the README, on a throwaway stack.'],
  ['npm run load-check', 'Starts a throwaway stack and prints how nginx, auth, console and engine answer with many pages polling at once.'],
  ['npm run auth:status', 'Reports whether an administrator account exists.'],
  ['npm run auth:reset', 'Deletes the account so onboarding runs again.'],
  ['npm run brand', 'Re-renders the PNG logo exports from the SVG mark.'],
];

export const PROJECT_TREE = `docker_bridge/
├─ index.html                 live console entry       ┐
├─ showcase/index.html        simulated showcase entry │
├─ docs/index.html            documentation entry      ├ protected
├─ account/index.html         account & security entry ┘
├─ portal/                    sign-in + onboarding (the only public bundle)
├─ auth/                      sign-in service: Node, no dependencies
├─ bridge/                    the MCP server: core (shared), docker, tools, mcp, activity
├─ console/                   the console's API: the bridge's tools over HTTP
├─ data/activity/             the MCP server's record of tool calls (git-ignored)
├─ src/
│  ├─ app/                    page shells (console, showcase, docs, account)
│  ├─ features/               one folder per section: model/ + ui/
│  │  ├─ console/             live engine status, stacks, inspect, activity
│  │  ├─ simulator/           scenarios, playback reducer, terminal, mesh
│  │  ├─ token-economy/       CSV dataset, cost maths, comparison slider
│  │  ├─ tool-playground/     live JSON-RPC request/response per tool
│  │  ├─ auth/ account/       portal, onboarding wizard, account page
│  │  └─ docs/                this page
│  ├─ mock-bridge/            the simulation: fixtures fed through bridge/core
│  ├─ shared/                 ui primitives, hooks, lib
│  └─ styles/                 design tokens and component layers
├─ public/brand/              logo, favicon, social image
├─ docker/nginx/              server config and security headers
├─ tests/e2e/                 Playwright specs
└─ security/                  secsuite targets and scan reports`;
