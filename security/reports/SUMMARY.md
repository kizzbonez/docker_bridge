# Security scan summary

**Scanned:** 2026-10-10 · **Version:** 0.5.0 · **Tooling:** local secsuite stack, plus `npm audit`

Every profile below passes the gate (no finding at HIGH or above) after the fixes described here. All of them
were run again for 0.3.0, which added the live console and its service. The scanners found one new notice, a
false positive in the nginx configuration. The decision that matters most in this release is one no scanner
flagged: a container now holds the Docker socket. It has its own section below.
The row-by-row record, including what the first scan found, is in [`findings.csv`](findings.csv).

## Result by scan

| Scan | Scanners | First scan | After fixes |
|---|---|---|---|
| Source: static analysis | semgrep | 1 medium, then 1 medium in 0.3.0 | **0** |
| Source: dependencies | trivy (lockfile), `npm audit` (314 packages) | 0 | **0** |
| Source: committed secrets | gitleaks | 0 | **0** |
| Source: infrastructure as code | checkov (Dockerfile, compose) | 0 | **0** |
| Image: `dockerbridge-dashboard` | trivy | 1 medium | **0** |
| Image: `dockerbridge-auth` | trivy | 22, including high | **0** |
| Image: `dockerbridge-console` | trivy | 0 | **0** |
| Live site: OWASP checks | owasp_checks | 1 critical, 1 high, 2 medium, 1 info | 1 medium, 1 info (both accepted) |
| Live site: templates | nuclei | 0 | **0** |
| Live site: browser | playwright_e2e | 1 low | 1 low (scanner artefact) |
| Architecture | lizard, madge, ls_lint | 4 low | 4 low (false positive) |
| Quality | jscpd, vulture | 12 low, then 15 low in 0.3.0 | 11 low (accepted) |

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

## 0.3.0: the console holds the Docker socket

Until this release nothing in the web stack could reach Docker. The live console changes that: the `console`
container mounts the Docker socket, and access to that socket is equivalent to root on the host. This was added
on purpose, to show real data, and it is the largest change to the risk of running this project.

What bounds it:

- The container publishes no port and sits on a network with no route to the outside. The only way in is nginx,
  which forwards `/api/` after the auth service confirms a session.
- The service does not rely on that alone: it asks the auth service about the session again, for every request.
- It offers three read-oriented tools and nothing else. There is no call that creates, starts, stops or removes a
  container, and `POST` is accepted on a single endpoint, as JSON, from the same site only.
- Commands go through the same exec policy as an agent's: an allowlist of diagnostic binaries, run as argv, read-only
  by default. On top of that the console refuses every command in its own compose project, where the account's
  password hash and authenticator key live, and refuses all commands if it cannot tell which project that is.
- Every log read and command run from the browser is written to the container log as an audit line.
- The container runs unprivileged with a read-only filesystem and no capabilities. It needs the socket's group
  and nothing more.

What remains, and is accepted:

- **Anyone who is signed in, or who steals a live session, can read the logs of every container on the machine
  and run the allowlisted diagnostics**, which include reading files and querying local databases. The sign-in
  (password, authenticator, lockout, strict same-site cookie) is what stands in front of that.
- **A code-execution flaw in the console service would be a host compromise.** The service is small, has no
  dependencies, and parses one small JSON body; that keeps the surface low, it does not remove it.

How to narrow it further: set `DOCKER_BRIDGE_PROJECTS` so the console sees only the projects you name, set
`CONSOLE_EXEC=false` so the browser can read but never run, put a second gate in front if the site is published,
or start the stack with `--scale console=0` and no socket is mounted at all.

## 0.5.0: the showcase can be made public

Every page asks for sign-in by default, and that has not changed. `PUBLIC_SHOWCASE=true` opens exactly one
thing: the simulated showcase, which holds made-up containers and logs. To keep that boundary a matter of
folders rather than of care, the showcase is built as its own bundle; nginx serves `/showcase/` without a
session and nothing else. The browser suite checks, as a visitor, that the docs, the account page, the protected
assets and screenshots are still refused, that the console API still answers 401, and that the public bundle does
not contain the console's API client. The default is checked with a second container: with the setting off the
showcase and its files are behind sign-in like everything else.

## 0.4.0: framing can be allowed for named sites

No page may frame this site by default, and that has not changed. `FRAME_ANCESTORS` now lets the operator name
sites that may, so the site can be embedded as a preview. The setting is checked before nginx starts: only
`self` and https origins are accepted, a bare wildcard is refused, and anything else stops the container, which
also keeps the value from altering the nginx configuration it is written into. Whoever is allowed to frame the
site can lay its own page over it, so only sites the operator controls belong in the list. The session cookie is
`SameSite=Strict`: a framing page on another domain never sees a signed-in session, one on the same domain does.

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
- **Remaining duplication (low).** Generated lockfile entries, the shared `<head>` of the separately built pages,
  and a few lines each in two API clients and two test files. The larger blocks 0.3.0 introduced were folded into
  shared helpers.
- **Variable upstream in nginx (medium, false positive).** semgrep flags `proxy_pass $console_upstream` because
  a variable there can mean a request chooses where nginx connects. Here it holds a fixed address, and is a
  variable only so that nginx still starts when the console is not running. Suppressed inline with that reason.

## Verified by the project's own tests

The Playwright suite runs against the real containers and asserts, among other things: the full security header
set on every kind of response, a Content-Security-Policy with no `unsafe-*` or third-party source, protected
content marked `Cache-Control: private`, 405 for write methods, 404 for dotfiles and path traversal, same-origin
network traffic only, `HttpOnly` + `SameSite=Strict` session cookies, lockout, and the open-redirect guard. For the
console: 401 for every `/api/` path without a session, 403 for a cross-site call, 405 for any write other than the
one tool endpoint, a refusal to run a command in its own stack, and no sight of containers outside its scope.

## Reproduce

```bash
docker compose up -d --build
docker exec security-suite-worker-1 python -m secsuite \
  --targets /repos/docker_bridge/security/secsuite/targets.yml \
  scan --target dockerbridge-source --profile static
```

Other targets: `dockerbridge-web` (profiles `default`, `e2e`; scanner `nuclei`), `dockerbridge-image-web`,
`dockerbridge-image-auth` and `dockerbridge-image-console` (scanner `trivy`), and `dockerbridge-source` with
profiles `architecture` and `quality`.
