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
      lead="DockerBridge is a Model Context Protocol server that sits between Claude Code and the Docker Engine. It answers the questions an agent asks while debugging containers, in as few tokens as possible, and refuses anything destructive."
    >
      <P>
        Without a bridge, an agent debugs containers the way a person would at a terminal: <C>docker ps</C>,{' '}
        <C>docker inspect</C>, <C>docker logs</C>. Each command dumps everything it has into the context window. A
        single noisy log can cost tens of thousands of tokens and crowd out the reasoning that follows.
      </P>
      <P>DockerBridge replaces those commands with three purpose-built tools:</P>
      <ToolCards />
      <Callout title="What is simulated here, and what is real">
        The server is real: it lives in <C>bridge/</C> and talks to your local Docker Engine. This site is its
        showcase, and what it displays is simulated: the container stack, logs and metrics are fixtures run through
        the server&apos;s own log pipeline and exec policy, in your browser. The site never contacts a Docker socket.
      </Callout>
    </DocSection>
  );
}
