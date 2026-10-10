import { SECURITY_HEADERS } from '../model/facts';
import { DataTable } from '../ui/data-table';
import { DocSection } from '../ui/doc-section';
import { Bullets, C, H3 } from '../ui/prose';

const CONTAINER = [
  <>
    Every container runs as an unprivileged user with a read-only root filesystem; nginx has a small <C>tmpfs</C>.
  </>,
  <>
    All Linux capabilities dropped and <C>no-new-privileges</C> set.
  </>,
  <>
    Only nginx publishes a port, on <C>127.0.0.1</C>. The sign-in and console services sit on an internal network
    with no route to the internet.
  </>,
  <>
    The Docker socket is mounted in one container, the console service, and nowhere else. It is reachable only
    through nginx with a session, checks that session again itself, and has no call that changes a container.
  </>,
  <>Memory, CPU and PID limits, with a health check on /healthz.</>,
];

const FRONTEND = [
  <>The sign-in portal is a separate bundle. No dashboard code, image or document is reachable without a session.</>,
  <>No inline scripts or styles, so the Content-Security-Policy needs no unsafe-inline or nonce.</>,
  <>Fonts, images and data are self-hosted. The page makes no third-party requests.</>,
  <>
    Code is coloured by building React elements, never with <C>innerHTML</C>, so user-typed text cannot inject markup.
  </>,
  <>User-supplied regular expressions are length-capped and screened for nested quantifiers before use.</>,
];

export function SecurityPosture() {
  return (
    <DocSection id="security" lead="How the site is locked down, and what is checked on every scan.">
      <H3>Response headers</H3>
      <DataTable caption="Security response headers" columns={['Header', 'Value', 'Effect']} rows={SECURITY_HEADERS} />
      <H3>Container</H3>
      <Bullets items={CONTAINER} />
      <H3>Front end</H3>
      <Bullets items={FRONTEND} />
    </DocSection>
  );
}
