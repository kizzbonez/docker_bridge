import { Callout } from '../ui/callout';
import { CodeSample } from '../ui/code-sample';
import { DataTable } from '../ui/data-table';
import { DocSection } from '../ui/doc-section';
import { Bullets, C, H3, P } from '../ui/prose';

const FIRST_START = `docker compose up -d --build
docker compose logs auth     # prints the one-time setup token`;

const RESET = `npm run auth:status           # is an account configured?
npm run auth:reset            # delete it; a new setup token is printed on restart`;

const WIZARD = [
  <>
    <strong className="text-ink">Verify.</strong> Paste the setup token from the auth container&apos;s logs. It proves
    you control the server, so nobody else can claim a fresh install.
  </>,
  <>
    <strong className="text-ink">Account.</strong> Choose the administrator&apos;s username and a password of at least
    12 characters. A live checklist shows exactly what the server will accept.
  </>,
  <>
    <strong className="text-ink">Authenticator.</strong> Scan the QR code with any TOTP app and confirm with a
    6-digit code. Two-factor authentication is not optional.
  </>,
  <>
    <strong className="text-ink">Recovery.</strong> Save the ten single-use recovery codes. They are shown once.
  </>,
];

const CONTROLS: string[][] = [
  ['Password storage', 'scrypt (N=2^15, r=8, p=3) with a per-password salt; only the hash is kept.'],
  ['Second factor', 'TOTP (RFC 6238). A code is accepted once: replays are refused, with ±30 s of clock drift allowed.'],
  ['Brute force', 'Five failures lock that client and account for 15 minutes; a challenge allows five code guesses.'],
  ['Sessions', '256-bit random token in an HttpOnly, SameSite=Strict cookie. 12 h lifetime, 2 h idle timeout.'],
  ['Cross-site requests', 'State-changing calls require JSON and are refused when the browser reports another origin.'],
  ['Sensitive changes', 'A new password or new recovery codes need a fresh authenticator code, even when signed in.'],
  ['Audit trail', 'Sign-ins, failures, lockouts and changes are logged as JSON lines and shown on the account page.'],
];

function FirstStart() {
  return (
    <>
      <H3>First start</H3>
      <P>
        A new install has no account. The auth service prints a one-time setup token and the site opens on the
        onboarding wizard:
      </P>
      <CodeSample title="shell" text={FIRST_START} />
      <ol className="list-decimal space-y-2 pl-6 leading-relaxed text-ink-dim marker:font-mono marker:text-sky-400">
        {WIZARD.map((step, index) => (
          <li key={index}>{step}</li>
        ))}
      </ol>
    </>
  );
}

function Recovery() {
  return (
    <>
      <H3>Locked out?</H3>
      <P>
        If the authenticator and the recovery codes are both gone, reset from the host. This deletes the account and
        restarts onboarding with a new token; it needs shell access to the server, which is the point.
      </P>
      <CodeSample title="shell" text={RESET} />
      <Callout kind="warning" title="Behind a proxy or tunnel">
        Serve the site over HTTPS so the session cookie is marked <C>Secure</C>. Lockouts are keyed on the client
        address nginx sees: behind a proxy, configure <C>real_ip_header</C> in <C>docker/nginx/default.conf</C> so that
        is the visitor, not the proxy.
      </Callout>
    </>
  );
}

const MANAGING = [
  <>
    <a href="/account/" className="text-cyan-300 underline underline-offset-4 hover:text-cyan-400">Account &amp; security</a> lists
    every active session and lets you end any of them, or all the others at once.
  </>,
  <>Change the password or regenerate recovery codes there; both ask for a fresh authenticator code.</>,
  <>Recent sign-ins, failures and lockouts appear at the bottom of the same page.</>,
];

export function Access() {
  return (
    <DocSection
      id="access"
      lead="Nothing on this site is public. Every page, asset and document is served only to a signed-in administrator; the sign-in page is the sole exception."
    >
      <FirstStart />
      <H3>Signing in</H3>
      <P>
        Sign-in takes two steps: username and password, then a code from the authenticator app or a recovery code.
        Wrong usernames and wrong passwords get the same answer, in the same time.
      </P>
      <H3>Managing the account</H3>
      <Bullets items={MANAGING} />
      <H3>What protects the account</H3>
      <DataTable caption="Authentication controls" columns={['Control', 'How it works']} rows={CONTROLS} />
      <Recovery />
    </DocSection>
  );
}
