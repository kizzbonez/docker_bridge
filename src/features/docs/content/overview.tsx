import { TOOL_NAMES, TOOL_SPECS } from '@bridge/core/tool-specs';
import { Callout } from '../ui/callout';
import { DocSection } from '../ui/doc-section';
import { C, P } from '../ui/prose';

function ToolCards() {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {TOOL_NAMES.map((name) => (
        <li key={name} className="rounded-xl border border-cyan-500/20 bg-carbon-800/40 p-4">
          <a href={`#tool-${name}`} className="font-mono text-[13px] break-all text-cyan-300 hover:underline">
            {name}
          </a>
          <p className="mt-2 text-sm leading-relaxed text-ink-dim">{TOOL_SPECS[name].description}</p>
        </li>
      ))}
    </ul>
  );
}

export function Overview() {
  return (
    <DocSection
      id="overview"
      lead="DockerBridge is a Model Context Protocol server that sits between an agent and the Docker Engine. It answers the questions an agent asks while debugging containers, in as few tokens as possible, and refuses anything destructive."
    >
      <P>
        Without a bridge, an agent debugs containers the way a person would at a terminal: <C>docker ps</C>,{' '}
        <C>docker inspect</C>, <C>docker logs</C>. Each command dumps everything it has into the context window. A
        single noisy log can cost tens of thousands of tokens and crowd out the reasoning that follows.
      </P>
      <P>DockerBridge replaces those commands with three purpose-built tools:</P>
      <ToolCards />
      <P>
        It is not tied to one agent. Any MCP client that can launch a local server over stdio can use it: Claude Code,
        Claude Desktop, Cursor, VS Code, Codex CLI, Windsurf, Gemini CLI and others.
      </P>
      <Callout title="What is real here, and what is simulated">
        The server is real: it lives in <C>bridge/</C> and talks to your local Docker Engine. The{' '}
        <a href="/" className="text-cyan-300 underline underline-offset-4 hover:text-cyan-400">
          console
        </a>{' '}
        is real too: it shows that engine live, through the same code. The{' '}
        <a href="/showcase/" className="text-cyan-300 underline underline-offset-4 hover:text-cyan-400">
          showcase
        </a>{' '}
        is a simulation: its container stack, logs and metrics are fixtures run through the server&apos;s own log
        pipeline and exec policy, in your browser.
      </Callout>
    </DocSection>
  );
}
