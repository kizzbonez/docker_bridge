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
        The server lives in this repository under <C>bridge/</C> and runs straight from source with Node 22.18 or
        newer: there is nothing to build or install. Clone the repository, then paste the block below into{' '}
        <C>~/.claude.json</C>, replacing the path with where the clone lives.
      </P>
      <CodeSample title="~/.claude.json" language="json" text={MCP_CONFIG_JSON} />
      <P>Prefer a terminal? This registers the same server without editing JSON:</P>
      <CodeSample title="shell" text={CLI_COMMAND} />
      <Callout title="Scopes">
        <C>--scope user</C> makes the server available in every project. To offer it to a team instead, commit the
        same block as <C>.mcp.json</C> at the root of the project they share.
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
