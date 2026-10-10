import { CLI_COMMAND, MCP_CONFIG_JSON, SERVER_NAME } from '@/features/setup/model/config-snippets';
import { Callout } from '../ui/callout';
import { CodeSample } from '../ui/code-sample';
import { DocSection } from '../ui/doc-section';
import { C, H3, P } from '../ui/prose';

const VERIFY = `claude mcp list
claude mcp get ${SERVER_NAME}`;

const FIRST_PROMPT = `Orders return 502 since the last deploy.
Use the docker-debug-bridge tools to find out why and propose a fix.`;

export function QuickStart() {
  return (
    <DocSection id="quick-start" lead="Register the server, confirm Claude Code can see it, then ask a question.">
      <H3>1. Add the server</H3>
      <P>
        Paste the block below into <C>~/.claude.json</C> to make the server available everywhere, or save it as{' '}
        <C>.mcp.json</C> at a repository root to share it with everyone who works in that project.
      </P>
      <CodeSample title="~/.claude.json  ·  .mcp.json" language="json" text={MCP_CONFIG_JSON} />
      <P>Prefer a terminal? This registers the same server without editing JSON:</P>
      <CodeSample title="shell" text={CLI_COMMAND} />
      <Callout title="Scopes">
        <C>claude mcp add</C> saves to the local scope by default. Pass <C>--scope user</C> for all your projects or{' '}
        <C>--scope project</C> to write <C>.mcp.json</C>.
      </Callout>

      <H3>2. Verify the connection</H3>
      <P>
        Start a new Claude Code session and run <C>/mcp</C>. The server should be listed as connected with three
        tools. From a shell:
      </P>
      <CodeSample title="shell" text={VERIFY} />

      <H3>3. Ask a real question</H3>
      <P>Describe the symptom and let the agent choose the tools:</P>
      <CodeSample title="prompt" text={FIRST_PROMPT} />
      <P>
        To see what that looks like before wiring anything up, run the <a href="/#simulator" className="text-cyan-300 underline underline-offset-4 hover:text-cyan-400">live simulation</a>.
      </P>
    </DocSection>
  );
}
