# Security scan summary

**Scanned:** 2026-10-10 · **Version:** 0.2.0 · **Tooling:** local secsuite stack, plus `npm audit`

Every profile below passes the gate (no finding at HIGH or above) after the fixes described here. All of them
were run again for 0.2.0, which added the MCP server in `bridge/`; the scanners reported nothing new.
The row-by-row record, including what the first scan found, is in [`findings.csv`](findings.csv).

## Result by scan

| Scan | Scanners | First scan | After fixes |
|---|---|---|---|
| Source: static analysis | semgrep | 1 medium | **0** |
| Source: dependencies | trivy (lockfile), `npm audit` (314 packages) | 0 | **0** |
| Source: committed secrets | gitleaks | 0 | **0** |
| Source: infrastructure as code | checkov (Dockerfile, compose) | 0 | **0** |
| Image: `dockerbridge-dashboard` | trivy | 1 medium | **0** |
| Image: `dockerbridge-auth` | trivy | 22, including high | **0** |
| Live site: OWASP checks | owasp_checks | 1 critical, 1 high, 2 medium, 1 info | 1 medium, 1 info (both accepted) |
| Live site: templates | nuclei | 0 | **0** |
| Live site: browser | playwright_e2e | 1 low | 1 low (scanner artefact) |
| Architecture | lizard, madge, ls_lint | 4 low | 4 low (false positive) |
| Quality | jscpd, vulture | 12 low | 9 low (accepted) |

## What was fixed

1. **Image CVEs in the auth container.** All 22 findings came from packages bundled with npm in the Node base
   image. The auth service has no dependencies, so npm, npx, corepack and yarn are now removed from its image
   and pending OS patches are applied at build time. The nginx image also takes OS patches, clearing a zlib CVE.
2. **Regex input in the playground.** `docker_tail_filtered_logs` compiles a caller-supplied pattern, which is the
   feature. Writing a test for the worst case showed a pattern with three unbounded quantifiers taking ten
   seconds on a hostile line. The guard now refuses nested quantifiers, repeated groups with alternatives and
   more than two unbounded quantifiers, and tests at most 300 characters of a line. The remaining semgrep
   notice is suppressed inline with that rationale.
3. **Probes answered with a page.** The scanner reported `/backup.sql`, `/settings.py` and `/docker-compose.yml`
   as exposed. Nothing was: it had followed the sign-in redirect and read the login page. The wall now answers
   an anonymous request for anything that looks like a file with a plain 404, and only page requests are sent
   to sign-in, so a probe learns nothing about what exists.

## Found by review, not by a scanner

Building the real server meant the exec policy would guard a real Docker socket, so it was reviewed by hand and
exercised against a live engine. Three things turned up that no scanner had flagged:

1. **`env` could launch anything.** It was on the allowlist as a way to read the environment, but
   `env sh -c ...` runs an arbitrary program. `env` with arguments is now refused.
2. **The first matching rule decided.** A command that matched a state-changing rule could pass in read-write
   mode before a later deny rule was consulted. Every rule is now evaluated and a deny always wins.
3. **A wrapper process outlived each exec.** Deadlines were enforced by wrapping the command in the container's
   `timeout`, which left a defunct process behind every call. The bridge now enforces the deadline itself and
   runs the command directly.

## What is accepted, and why

- **Plain HTTP (medium).** The container listens on `127.0.0.1` only. TLS belongs to the reverse proxy or tunnel
  placed in front; the site already sends HSTS and marks its session cookie `Secure` when reached over HTTPS.
- **No `security.txt` (info).** This is a private, single-administrator console.
- **Console message in the scanner's browser (low).** Chrome ignores `Cross-Origin-Opener-Policy` on a plain-HTTP,
  non-localhost origin and logs that. It does not occur on `localhost` or over HTTPS, and the project's own
  browser suite fails on any console error.
- **Naming violations (low, false positive).** The secsuite ls_lint scanner runs with its own configuration
  rather than this repository's `.ls-lint.yml`, under which the tree has no violations.
- **Remaining duplication (low).** Generated lockfile entries and the shared `<head>` of three separately built
  pages.

## Verified by the project's own tests

The Playwright suite runs against the real containers and asserts, among other things: the full security header
set on every kind of response, a Content-Security-Policy with no `unsafe-*` or third-party source, protected
content marked `Cache-Control: private`, 405 for write methods, 404 for dotfiles and path traversal, same-origin
network traffic only, `HttpOnly` + `SameSite=Strict` session cookies, lockout, and the open-redirect guard.

## Reproduce

```bash
docker compose up -d --build
docker exec security-suite-worker-1 python -m secsuite \
  --targets /repos/docker_bridge/security/secsuite/targets.yml \
  scan --target dockerbridge-source --profile static
```

Other targets: `dockerbridge-web` (profiles `default`, `e2e`; scanner `nuclei`), `dockerbridge-image-web` and
`dockerbridge-image-auth` (scanner `trivy`), and `dockerbridge-source` with profiles `architecture` and `quality`.
