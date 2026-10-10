import { FRAMING_EXAMPLE, PUBLIC_SHOWCASE_EXAMPLE, SECURITY_HEADERS } from '../model/facts';
import { CodeSample } from '../ui/code-sample';
import { DataTable } from '../ui/data-table';
import { DocSection } from '../ui/doc-section';
import { Bullets, C, H3, P } from '../ui/prose';

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
  <>
    The sign-in portal and the showcase are each a separate bundle. No code, image or document of the console, the
    docs or the account page is reachable without a session.
  </>,
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
      <H3>What a visitor can see</H3>
      <P>
        By default, nothing: every page asks for sign-in. The one thing you can open up is the showcase, which holds
        made-up containers and logs and no data of yours. With the setting below a visitor who opens the site is
        shown the showcase, with a link to sign in; you still land on the console. The console, its API, this
        documentation and the account page stay behind sign-in either way.
      </P>
      <CodeSample title=".env" text={PUBLIC_SHOWCASE_EXAMPLE} />
      <H3>Showing the site inside another page</H3>
      <P>
        By default no page may put this site in a frame, which is what stops another site from laying its own
        buttons over yours. To embed it, for example as a preview on a portfolio, name the sites that may in{' '}
        <C>.env</C> and restart: <C>self</C> and https origins, separated by spaces. A bare wildcard and plain http
        origins are refused, and the container will not start with them.
      </P>
      <CodeSample title=".env" text={FRAMING_EXAMPLE} />
      <P>
        Visitors to the framing page see what any visitor sees: the sign-in page, or the showcase if it is public.
        Name only sites you control: if you are signed in and the framing site is on the same domain, it shows your live console inside
        its page.
      </P>
      <H3>Container</H3>
      <Bullets items={CONTAINER} />
      <H3>Front end</H3>
      <Bullets items={FRONTEND} />
    </DocSection>
  );
}
