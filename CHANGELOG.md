# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.1.0]: https://github.com/kizzbonez/docker_bridge/releases/tag/v0.1.0
