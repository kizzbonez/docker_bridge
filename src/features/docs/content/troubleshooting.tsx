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
    question: 'The server does not appear in my client',
    answer: (
      <>
        Clients load MCP servers when they start, so restart the client or open a new session first. Then check that
        the JSON is valid, that the entry sits under <C>mcpServers</C>, and that the path points at{' '}
        <C>bridge/index.ts</C> inside your clone. Each client has its own file: a server registered for one does not
        appear in another. In Claude Code, <C>claude mcp list</C> shows what was loaded and from which scope.
      </>
    ),
  },
  {
    question: 'Claude Desktop on Windows ignores my config file',
    answer: (
      <>
        The Microsoft Store version keeps its config in a package folder, not in the usual <C>AppData/Roaming/Claude</C>.
        Open it from inside the app (Settings → Developer → Edit Config), give the full path to <C>node.exe</C> as the
        command, and quit the app from the system tray before reopening it.
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
        The user running the MCP client needs access to the Docker socket: membership of the <C>docker</C> group on
        Linux, or a running Docker Desktop. Point <C>DOCKER_SOCKET_PATH</C> elsewhere if your engine uses another
        socket. For the console container on Linux, set <C>DOCKER_SOCKET_GID</C> to the gid of the <C>docker</C> group.
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
    question: 'Which numbers are real?',
    answer: (
      <>
        Everything on the console is real: it is read from your engine and from the activity log. The showcase is
        not: its figures are illustrative and come from a simulated stack. In both, token counts are estimates at
        about four characters per token.
      </>
    ),
  },
  {
    question: 'The console says the engine is not answering',
    answer: (
      <>
        Check that Docker is running, then <C>docker compose logs console</C>. A permission error on Linux means{' '}
        <C>DOCKER_SOCKET_GID</C> does not match the group that owns the socket.
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
