<p align="center">
  <img src="public/brand/og-image.png" alt="DockerBridge MCP — Autonomous Container Diagnostics for Agentic Workflows" width="820">
</p>

<p align="center">
  <b>DockerBridge MCP</b><br>
  A Model Context Protocol server that lets Claude Code debug containers on your Docker Engine,<br>
  with its interactive dashboard and documentation.
</p>

<p align="center">
  <img alt="version" src="https://img.shields.io/badge/version-0.2.0-06b6d4">
  <img alt="tests" src="https://img.shields.io/badge/tests-307%20unit%20%C2%B7%20123%20e2e-10b981">
  <img alt="auth" src="https://img.shields.io/badge/sign--in-password%20%2B%20TOTP-38bdf8">
  <img alt="csp" src="https://img.shields.io/badge/CSP-no%20inline%2C%20self%20only-10b981">
  <img alt="stack" src="https://img.shields.io/badge/React%2019%20%C2%B7%20Vite%208%20%C2%B7%20Tailwind%204-0f172a">
</p>

<p align="center">
  <a href="#the-mcp-server">MCP server</a> ·
  <a href="#the-dashboard">Dashboard</a> ·
  <a href="#what-is-inside">What is inside</a> ·
  <a href="#sign-in-and-onboarding">Sign-in</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#testing">Testing</a> ·
  <a href="#security">Security</a> ·
  <a href="#versioning">Versioning</a>
</p>

---

This repository holds two things:

- **The MCP server** (`bridge/`) — real. It talks to your local Docker Engine and gives Claude Code three tools.
- **The dashboard** — its showcase and documentation. What it displays is **simulated**: fixture logs and
  containers run through the server's own log pipeline and exec policy, in the browser. The site never contacts a
  Docker socket.

## The MCP server

Three tools, built for an agent rather than a person at a terminal:

| Tool | What it returns |
|---|---|
| `docker_get_stack_topology` | One compact graph of a compose project: services, health, restarts, CPU and memory, dependency edges |
| `docker_tail_filtered_logs` | The tail of a log with ANSI stripped, filtered by regex, repeats collapsed, cut at a token budget |
| `docker_safe_exec` | The output of one allowlisted diagnostic command, run as argv with a deadline. Never a shell |

It runs straight from source with Node 22.18 or newer. There is nothing to build and it has no dependencies.

```bash
git clone https://github.com/kizzbonez/docker_bridge.git
claude mcp add docker-debug-bridge --scope user \
  -e READ_ONLY_MODE=true \
  -- node /path/to/docker_bridge/bridge/index.ts
```

Then run `/mcp` in Claude Code to confirm three tools are connected, and ask something like *"orders return 502
since the last deploy, find out why"*.

| Variable | Default | Effect |
|---|---|---|
| `READ_ONLY_MODE` | on | `docker_safe_exec` refuses every state-changing command. Only `false`, `0`, `no` or `off` turns it off |
| `DOCKER_SOCKET_PATH` | `/var/run/docker.sock`, or `//./pipe/docker_engine` on Windows | The local engine to talk to. Remote engines are not supported |
| `DOCKER_BRIDGE_PROJECTS` | unset | Comma-separated compose projects. When set, no tool can see anything outside them |

**What it will not do.** There is no tool to start, stop, remove or create anything. Exec is limited to an
allowlist of diagnostic binaries, spawned as argv: pipes, redirects and chaining are refused, as are credential
files, non-local database connections and writing SQL. Output is redacted for secrets and clipped. It is a
guardrail, not a sandbox: the Docker socket is root-equivalent, so the container's own permissions remain the real
boundary.

## The dashboard

```bash
docker compose up -d --build
docker compose logs auth          # first start: prints the one-time setup token
```

Open **http://127.0.0.1:8742**, paste the token, and follow the onboarding wizard. That is the whole install.

The port is bound to `127.0.0.1`, so the site is reachable from this machine only. To publish it, keep that bind
and point a tunnel at it: with Cloudflare Tunnel, add a public hostname whose service is
`http://host.docker.internal:8742` (or `http://localhost:8742` if cloudflared runs on the host). Session cookies
become `Secure` automatically over HTTPS, and lockouts use the visitor address Cloudflare reports. Leave Rocket
Loader and automatic Web Analytics injection off for the hostname: the site's Content-Security-Policy refuses
injected scripts.

## What is inside

| | |
|---|---|
| **Live debugging simulator** | A Claude Code terminal streams the agent's reasoning, the exact JSON-RPC tool calls and the proposed diff, while a container mesh reacts beside it. Trigger a 502 outage, a Redis OOM kill (`ExitCode: 137 (OOMKilled)`) or a database connection test. |
| **Token & context economy** | A draggable before/after view of raw `docker logs` against the filtered result, with cost and context-window pressure recomputed from a CSV dataset you can download. |
| **MCP tool playground** | Change any parameter of the three tools and watch the request and response update. Try a destructive command or a runaway regex and read the guardrail's answer. |
| **Documentation** | A full docs page whose tool tables, sample payloads and guardrail rules are rendered from the same schemas and policy the playground runs, so they cannot drift. |
| **Sign-in wall** | Every page, asset and document sits behind password + authenticator sign-in. A first-run wizard creates the account. |

<table>
  <tr>
    <td width="50%"><img src="public/screenshots/dashboard-hero.png" alt="Dashboard hero and status bar"></td>
    <td width="50%"><img src="public/screenshots/simulator-redis-oom.png" alt="Simulator during a Redis OOM incident"></td>
  </tr>
  <tr>
    <td align="center"><sub>Status bar, hero and animated counters</sub></td>
    <td align="center"><sub>Redis OOM: the mesh alarms while the agent diagnoses</sub></td>
  </tr>
  <tr>
    <td><img src="public/screenshots/token-economy.png" alt="Token economy comparison"></td>
    <td><img src="public/screenshots/tool-playground.png" alt="Tool playground blocking a destructive command"></td>
  </tr>
  <tr>
    <td align="center"><sub>Raw logs against the filtered tool output</sub></td>
    <td align="center"><sub>A destructive command, refused with a reason</sub></td>
  </tr>
  <tr>
    <td><img src="public/screenshots/onboarding.png" alt="Onboarding wizard, authenticator step"></td>
    <td><img src="public/screenshots/account-security.png" alt="Account and security page"></td>
  </tr>
  <tr>
    <td align="center"><sub>First-run onboarding: enrolling an authenticator</sub></td>
    <td align="center"><sub>Sessions, credentials and security activity</sub></td>
  </tr>
  <tr>
    <td><img src="public/screenshots/docs-tools-reference.png" alt="Documentation, tools reference"></td>
    <td><img src="public/screenshots/sign-in.png" alt="Sign-in page"></td>
  </tr>
  <tr>
    <td align="center"><sub>Documentation generated from the tool schemas</sub></td>
    <td align="center"><sub>The sign-in portal: the only public page</sub></td>
  </tr>
</table>

## Sign-in and onboarding

Nothing is public. A fresh install has no account, so the first visit opens a four-step wizard:

1. **Verify** — paste the one-time setup token from `docker compose logs auth`. It proves you control the server, so
   nobody else can claim a new install.
2. **Account** — choose the administrator's username and a password of at least 12 characters, against a live checklist.
3. **Authenticator** — scan the QR code with any TOTP app and confirm with a code. Two-factor is not optional.
4. **Recovery** — save ten single-use recovery codes. They are shown once.

After that, sign-in is two steps: password, then an authenticator or recovery code.
**Account & security** (`/account/`) lists every active session, rotates the password and recovery codes, and shows
recent security activity.

| Control | How it works |
|---|---|
| Password storage | scrypt (N=2^15, r=8, p=3), per-password salt; only the hash is stored |
| Second factor | TOTP (RFC 6238); each code is accepted once, with ±30 s of clock drift |
| Brute force | 5 failures lock that client + account for 15 minutes; 5 guesses per sign-in challenge |
| Sessions | 256-bit token in an `HttpOnly`, `SameSite=Strict` cookie; 12 h lifetime, 2 h idle timeout; revocable |
| Cross-site requests | State-changing calls require JSON and are refused when the browser reports another origin |
| Sensitive changes | A new password or new recovery codes need a fresh authenticator code |
| Audit trail | Sign-ins, failures, lockouts and changes, as JSON lines in the container log and on the account page |

Lost the authenticator **and** the recovery codes? Reset from the host, which is deliberately the only way:

```bash
npm run auth:reset     # deletes the account; a new setup token is printed on restart
```

## Architecture

```mermaid
flowchart LR
  B([Browser]) -->|127.0.0.1:8742| N[nginx<br/>unprivileged, read-only]
  N -->|"auth_request: is there a session?"| A[auth service<br/>Node, zero dependencies]
  N -->|only with a session| S[(dashboard · docs · account<br/>static files)]
  N -->|always| P[(sign-in portal<br/>separate bundle)]
  A --- V[(volume<br/>account.json)]
```

- **Two containers.** `dashboard` is nginx serving static files; `auth` is a small Node service with no npm
  dependencies that nginx consults before serving anything. `auth` publishes no port and sits on an internal
  network with no route to the internet.
- **Two bundles.** The sign-in portal is built separately, so no dashboard code, image or document is reachable
  without a session.
- **One source of truth.** The tool schemas, exec policy, regex guard and log pipeline live in `bridge/core`. The
  MCP server enforces them; the simulator, the playground and the docs import the same files, so what the
  dashboard shows is what the server does. The browser likewise imports the password policy from the auth service.

```
docker_bridge/
├─ index.html · docs/ · account/   protected pages
├─ portal/                         sign-in + onboarding (the only public bundle)
├─ bridge/                         the MCP server
│  ├─ core/                        tool schemas, exec policy, log pipeline (shared with the dashboard)
│  ├─ docker/                      Engine API client over socket or named pipe
│  ├─ tools/ · mcp/                the three tools, the stdio protocol
├─ auth/                           sign-in service: TOTP, sessions, lockout, audit log
├─ src/
│  ├─ features/                    one folder per section: model/ + ui/
│  ├─ mock-bridge/                 the simulation: fixtures fed through bridge/core
│  ├─ shared/                      ui primitives, hooks, lib
│  └─ styles/                      design tokens and component layers
├─ docker/nginx/                   server config, security headers
├─ tests/e2e/                      Playwright specs
└─ security/                       secsuite targets and scan reports
```

Files stay small on purpose: ESLint fails the build above 200 lines per file or 40 lines per function.

## Development

```bash
npm install
npm run dev            # Vite on 127.0.0.1:5173 (no sign-in wall in dev)
```

| Script | What it does |
|---|---|
| `npm run verify` | Typecheck, lint with size budgets, unit tests and a production build |
| `npm run test` | Vitest: 307 unit and component tests, including the auth service and the MCP server |
| `npm run e2e` | Starts a throwaway stack, walks through onboarding, then runs 123 browser tests |
| `npm run screenshots` | Regenerates the images above on a throwaway stack |
| `npm run brand` | Re-renders the PNG logo exports from the SVG mark |
| `npm run auth:status` / `auth:reset` | Inspect or delete the administrator account |

## Testing

- **Unit and component (Vitest)** — the exec policy and its bypass attempts, the log pipeline, the simulator's
  playback reducer, every widget, and the auth service end to end over HTTP: RFC 6238 test vectors, replay
  protection, lockout, session expiry, CSRF and request hygiene.
- **The MCP server** — its HTTP client is driven against a fake Docker Engine listening on a real pipe, and the
  server itself is run as a child process and spoken to over stdio, the way Claude Code does.
- **End to end (Playwright)** — against the real containers, at desktop and phone sizes: onboarding through the UI,
  two-factor sign-in, lockout, account changes, every dashboard interaction, WCAG A/AA checks with axe on every
  page, and the response headers. Every test fails on a console error, which includes any CSP violation.

The e2e and screenshot runs use their own compose project, port and volume, so they never touch a real install.

## Security

- **Headers.** A Content-Security-Policy of `default-src 'none'` with first-party files only (no inline script or
  style, no third-party origin), plus `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, COOP,
  CORP and a locked-down Permissions-Policy. Protected responses are `Cache-Control: private`, so a CDN in front
  cannot cache and replay them.
- **Containers.** Unprivileged users, read-only root filesystems, all capabilities dropped, `no-new-privileges`,
  memory, CPU and PID limits, base images pinned by digest.
- **Scans.** Run with the local secsuite stack; targets are in [`security/secsuite/targets.yml`](security/secsuite/targets.yml)
  and results in [`security/reports`](security/reports).

## Versioning

This project follows [Semantic Versioning](https://semver.org) and [Conventional Commits](https://www.conventionalcommits.org).
Each release is a git tag (`vMAJOR.MINOR.PATCH`) with an entry in [CHANGELOG.md](CHANGELOG.md).
