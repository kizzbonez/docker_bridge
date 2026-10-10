# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-10-10

### Added

- `FRAME_ANCESTORS`: the sites that may show this one inside a frame, for embedding it as a preview on another
  page. `none` by default, as before. It takes `self` and https origins; a bare wildcard, http origins and
  anything that is not a list of sites stop the container from starting. When a site is named,
  `X-Frame-Options` is no longer sent, since it cannot express a list, and the Content-Security-Policy decides.

## [0.3.2] - 2026-10-10

### Added

- An MIT licence, and `THIRD_PARTY_NOTICES.md` listing what the built site bundles (React, uqr, Tailwind CSS and
  three fonts under the SIL Open Font License) with their licences. Earlier tags carry no licence file.

## [0.3.1] - 2026-10-10

### Fixed

- The MCP server now writes an activity record before the answer to the call leaves. It was written just after,
  so a client that ended the server straight after its last call lost that call from the log. Found by calling
  the released server once and looking for the record.

## [0.3.0] - 2026-10-10

### Added

- **The live console.** The page you land on after signing in now shows the Docker Engine on this machine, read
  through the bridge: engine status, every compose project with health, CPU and memory per service, a filtered
  log tail and guarded exec against a container you pick, and a timeline of what agents asked for.
- **The console service** (`console/`), a third container that serves the bridge's tools over HTTP to the signed-in
  administrator. It is the one container given the Docker socket. It publishes no port, checks the session itself
  as well as behind nginx, never runs a command in its own stack, and can be left out with
  `docker compose up --scale console=0`.
- **An activity log.** The MCP server records each tool call in `data/activity/`: when, which client, which tool
  and target, the command or filter, how it went and the token counts. Never the output.
  `DOCKER_BRIDGE_ACTIVITY=off` disables it.
- Setup for **any MCP client**: the shared `mcpServers` block with where each client keeps it (Claude Code, Claude
  Desktop, Cursor, Windsurf, Gemini CLI), plus the VS Code and Codex CLI formats.
- `CONSOLE_EXEC`, `DOCKER_SOCKET_GID` and `ACTIVITY_DIR` settings for the console.
- The console service shares one engine reading among every page asking for it, so the number of open tabs does
  not multiply the load on Docker. `npm run load-check` measures the whole chain under many pages at once.
- Tests: 388 unit and component tests and 157 end-to-end tests, the latter now reading a real Docker Engine.

### Changed

- The simulated showcase moved from `/` to `/showcase/`. `/` is the live console.
- The server is described as what it is, a standard MCP server, rather than as a Claude Code add-on, across the
  site, the docs and the README.
- The setup guide starts with cloning the repository, because the server runs from a clone and is not on npm.
- The status bar on the console, docs and account pages reports the real engine. Only the showcase keeps the
  simulated readout, labelled as such.
- An anonymous request to `/api/` is answered with 401 JSON rather than a redirect to sign-in.
- Commits no longer carry a co-author trailer.

### Security

- Adding the console means one container now holds the Docker socket; before this release none did. How that is
  bounded, and what remains accepted, is set out in `security/reports/SUMMARY.md`.
- The browser tests and screenshots run a console limited to their own throwaway stack, so they neither depend on
  nor reveal what else runs on the machine.

## [0.2.0] - 2026-10-10

### Added

- **The MCP server** (`bridge/`). The three tools now run against a real Docker Engine over a unix socket or
  Windows named pipe, speaking MCP over stdio. Runs from source with Node, no dependencies, read-only by default.
  Register it with `claude mcp add`.
- `DOCKER_BRIDGE_PROJECTS` limits every tool to named compose projects.
- Best-effort secret redaction on everything read from a container, and a per-line length cap in log output.
- Cloudflare Tunnel support in nginx: the visitor address is taken from `CF-Connecting-IP`, so lockouts, rate
  limits and the audit log are per visitor.
- Tests for the server: its Engine client against a fake engine on a real pipe, and the server itself over stdio.
  The suite is now 307 unit and component tests and 123 end-to-end tests.

### Changed

- The tool schemas, exec policy, regex guard and log pipeline moved to `bridge/core`, shared by the server and the
  dashboard's simulation.
- The dashboard's setup section and the docs now register the server from the repository. The `npx` form remains
  as an option for a published package.
- `docker_safe_exec` reports a deadline rather than a kill: the bridge stops waiting and closes the stream.

### Security

- `env` with arguments is refused. It was on the allowlist, and `env sh -c ...` would have launched any program.
- A deny rule now always wins. Previously the first matching rule decided, so a state-changing match could mask a
  later deny.
- Credential files, `/proc`, `/dev` and key material are refused; database clients may only connect to localhost;
  `psql` is limited to reading SQL; redis commands are split into reads, writes and destructive ones.

## [0.1.0] - 2026-10-10

First release.

### Added

- **Dashboard** — status bar with a live system readout, hero with animated counters, and an architecture section.
- **Live debugging simulator** — a Claude Code terminal that streams reasoning, JSON-RPC tool calls and a proposed
  diff for three incidents (502 outage, Redis OOM kill, database connection test), next to a container mesh that
  reacts in real time.
- **Token and context economy** — a draggable raw-versus-filtered comparison driven by a downloadable CSV dataset.
- **MCP tool playground** — live request, response and schema for `docker_get_stack_topology`,
  `docker_tail_filtered_logs` and `docker_safe_exec`, backed by a mock of the server contract.
- **Documentation page** — setup, tool reference, guardrails, log pipeline, tour and troubleshooting, rendered from
  the same schemas and policy as the playground.
- **Sign-in wall** — a zero-dependency auth service behind nginx `auth_request`: scrypt password hashing, mandatory
  TOTP two-factor with replay protection, single-use recovery codes, lockout, revocable sessions with idle and
  absolute expiry, CSRF checks and an audit log.
- **First-run onboarding** — a wizard gated by a one-time setup token from the server logs: account, authenticator
  enrollment with QR code, recovery codes.
- **Account & security page** — active sessions, sign out everywhere else, password change, recovery-code
  regeneration and recent activity.
- **Docker** — two hardened containers (unprivileged, read-only, capabilities dropped), published on `127.0.0.1`
  only, with a strict Content-Security-Policy and security headers.
- **Brand** — logo mark, favicon, app icons and social card.
- **Tests** — 237 unit and component tests and 121 end-to-end tests, including accessibility checks with axe.

### Security

Hardening applied before release, after scanning with secsuite (see `security/reports/SUMMARY.md`):

- The auth image no longer ships npm, npx, corepack or yarn, and both images apply pending OS patches at build
  time. This cleared every image CVE the scan reported.
- The log filter refuses regex shapes that backtrack catastrophically and examines a bounded slice of each line.
- An anonymous request for anything that looks like a file is answered with 404 rather than a redirect to the
  sign-in page; only page requests are sent to sign-in.

[0.4.0]: https://github.com/kizzbonez/docker_bridge/compare/v0.3.2...v0.4.0
[0.3.2]: https://github.com/kizzbonez/docker_bridge/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/kizzbonez/docker_bridge/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/kizzbonez/docker_bridge/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/kizzbonez/docker_bridge/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/kizzbonez/docker_bridge/releases/tag/v0.1.0
