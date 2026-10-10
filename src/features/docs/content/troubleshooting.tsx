import type { ReactNode } from 'react';
import { DocSection } from '../ui/doc-section';
import { C } from '../ui/prose';

interface Faq {
  question: string;
  answer: ReactNode;
}

const FAQS: Faq[] = [
  {
    question: 'I cannot find the setup token',
    answer: (
      <>
        Run <C>docker compose logs auth</C> on the host. The token is printed on every start until an account exists.
        To choose it yourself, set <C>AUTH_SETUP_TOKEN</C> before starting the stack.
      </>
    ),
  },
  {
    question: 'I lost my authenticator and my recovery codes',
    answer: (
      <>
        Run <C>npm run auth:reset</C> on the host. It deletes the account and restarts onboarding with a new token.
        There is deliberately no way to do this from the browser.
      </>
    ),
  },
  {
    question: 'My authenticator codes are always rejected',
    answer: (
      <>
        TOTP depends on the clock. Check that the phone and the server agree on the time to within 30 seconds, and
        remember that each code works only once.
      </>
    ),
  },
  {
    question: 'The server does not appear under /mcp',
    answer: (
      <>
        Check that the JSON is valid and that the entry sits under <C>mcpServers</C>, then start a new session. Run{' '}
        <C>claude mcp list</C> to see what Claude Code actually loaded and from which scope.
      </>
    ),
  },
  {
    question: 'npx fails to start the server on Windows',
    answer: (
      <>
        On native Windows, launch npx through the command interpreter: set <C>"command": "cmd"</C> and{' '}
        <C>"args": ["/c", "npx", "-y", "…"]</C>. Inside WSL the plain <C>npx</C> form works.
      </>
    ),
  },
  {
    question: 'Permission denied on /var/run/docker.sock',
    answer: (
      <>
        The user running Claude Code needs access to the Docker socket: membership of the <C>docker</C> group on Linux,
        or a running Docker Desktop. Point <C>DOCKER_SOCKET_PATH</C> elsewhere if your engine uses another socket.
      </>
    ),
  },
  {
    question: 'A command I need is blocked',
    answer: (
      <>
        That is the default working as intended. Check the reason in the response: a state-changing command needs{' '}
        <C>READ_ONLY_MODE</C> set to <C>"false"</C>; anything outside the allowlist or matching a deny rule is refused
        in every mode.
      </>
    ),
  },
  {
    question: 'The copy buttons do nothing',
    answer: (
      <>
        Browsers only expose the clipboard on secure origins. <C>http://127.0.0.1</C> and <C>https://</C> both qualify;
        a plain <C>http://</C> LAN address does not.
      </>
    ),
  },
  {
    question: 'Are the numbers on the dashboard real?',
    answer: (
      <>
        No. They are illustrative figures from a simulated stack, and token counts are estimates at about four
        characters per token. Measure your own workload before quoting savings.
      </>
    ),
  },
];

export function Troubleshooting() {
  return (
    <DocSection id="troubleshooting" lead="The questions that come up first.">
      <div className="space-y-3">
        {FAQS.map((faq) => (
          <details key={faq.question} className="group rounded-xl border border-cyan-500/20 bg-carbon-800/40 open:border-cyan-400/40">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 font-display text-base font-semibold text-ink">
              {faq.question}
              <span aria-hidden="true" className="font-mono text-cyan-400 transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="px-4 pb-4 text-sm leading-relaxed text-ink-dim">{faq.answer}</p>
          </details>
        ))}
      </div>
    </DocSection>
  );
}
