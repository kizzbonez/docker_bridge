import { DASHBOARD_URL, NPM_SCRIPTS } from '../model/facts';
import { CodeSample } from '../ui/code-sample';
import { DataTable } from '../ui/data-table';
import { DocSection } from '../ui/doc-section';
import { C, H3, P } from '../ui/prose';

const COMPOSE = `docker compose up -d --build
docker compose logs auth     # first start: the one-time setup token
# then open ${DASHBOARD_URL} and follow the onboarding wizard`;

const LOCAL = `npm install
npm run dev`;

const SCANS = `# static analysis: semgrep, trivy, gitleaks, checkov
docker exec security-suite-worker-1 python -m secsuite \\
  --targets /repos/docker_bridge/security/secsuite/targets.yml \\
  scan --target dockerbridge-source --profile static

# running container: OWASP header and misconfiguration checks
docker exec security-suite-worker-1 python -m secsuite \\
  --targets /repos/docker_bridge/security/secsuite/targets.yml \\
  scan --target dockerbridge-web --profile default`;

export function RunDashboard() {
  return (
    <DocSection id="run-dashboard" lead="Two hardened containers: nginx serving the static site, and a small sign-in service it consults before serving anything.">
      <H3>With Docker</H3>
      <CodeSample title="shell" text={COMPOSE} />
      <P>
        The port is published on <C>127.0.0.1</C> only, so the site is reachable from this machine and nowhere else. To
        expose it, put a reverse proxy or tunnel in front; do not change the bind address.
      </P>

      <H3>Local development</H3>
      <CodeSample title="shell" text={LOCAL} />
      <P>
        The dev server has no sign-in wall: that is enforced by nginx and the auth service, which only run in Docker.
      </P>
      <DataTable caption="npm scripts" columns={['Script', 'What it does']} rows={NPM_SCRIPTS} />

      <H3>Security scans</H3>
      <P>
        Scans run through the local secsuite stack, which mounts this repository read-only at{' '}
        <C>/repos/docker_bridge</C>. Targets live in <C>security/secsuite/targets.yml</C>; reports are written to{' '}
        <C>security/reports</C>.
      </P>
      <CodeSample title="shell" text={SCANS} />
    </DocSection>
  );
}
