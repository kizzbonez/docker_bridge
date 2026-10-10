import {
  CLIENT_FILES,
  CLI_COMMAND,
  CLONE_COMMAND,
  CODEX_CONFIG_TOML,
  MCP_CONFIG_JSON,
  SERVER_NAME,
  VSCODE_CONFIG_JSON,
} from '@/features/setup/model/config-snippets';
import { Callout } from '../ui/callout';
import { CodeSample } from '../ui/code-sample';
import { DataTable } from '../ui/data-table';
import { DocSection } from '../ui/doc-section';
import { C, H3, P } from '../ui/prose';

const CLONE = `${CLONE_COMMAND}
cd docker_bridge
node --version    # needs 22.18 or newer
pwd               # the full path the next step asks for`;

const VERIFY = `claude mcp list
claude mcp get ${SERVER_NAME}`;

const FIRST_PROMPT = `Orders return 502 since the last deploy.
Use the docker-debug-bridge tools to find out why and propose a fix.`;

const LINK = 'text-cyan-300 underline underline-offset-4 hover:text-cyan-400';

function CloneStep() {
  return (
    <>
      <H3>1. Clone the repository</H3>
      <P>
        Start here, whichever client you use. The server is not published to npm: it lives in this repository under{' '}
        <C>bridge/</C> and runs straight from source, so a client can only start it from a clone on the same machine.
        There is nothing to build and nothing to install.
      </P>
      <CodeSample title="shell" text={CLONE} />
      <Callout title="Keep the path">
        Every block below contains <C>/path/to/docker_bridge</C>. Replace it with the full path of your clone. On
        Windows write it with forward slashes, for example <C>C:/Users/you/docker_bridge/bridge/index.ts</C>.
      </Callout>
    </>
  );
}

function RegisterStep() {
  return (
    <>
      <H3>2. Register it with your client</H3>
      <P>
        The bridge is a standard MCP server over stdio, so any MCP client can use it. Most of them read the same{' '}
        <C>mcpServers</C> block; only the file it goes in differs.
      </P>
      <CodeSample title="mcpServers block" language="json" text={MCP_CONFIG_JSON} />
      <DataTable caption="Where each client keeps its MCP servers" columns={['Client', 'File', 'Note']} rows={CLIENT_FILES} />
      <P>Claude Code can register it from a terminal instead of editing JSON:</P>
      <CodeSample title="Claude Code" text={CLI_COMMAND} />
      <P>VS Code and Codex CLI use their own formats:</P>
      <CodeSample title=".vscode/mcp.json" language="json" text={VSCODE_CONFIG_JSON} />
      <CodeSample title="~/.codex/config.toml" text={CODEX_CONFIG_TOML} />
    </>
  );
}

function VerifyStep() {
  return (
    <>
      <H3>3. Verify the connection</H3>
      <P>
        Restart the client, or start a new session, so it loads the server. It should list <C>{SERVER_NAME}</C> with
        three tools. In Claude Code that is <C>/mcp</C>, or from a shell:
      </P>
      <CodeSample title="shell" text={VERIFY} />
      <P>
        The first call an agent makes also shows up in the{' '}
        <a href="/#activity" className={LINK}>
          console&apos;s activity list
        </a>{' '}
        within a few seconds, with the name of the client that made it.
      </P>
    </>
  );
}

function AskStep() {
  return (
    <>
      <H3>4. Ask a real question</H3>
      <P>Describe the symptom and let the agent choose the tools:</P>
      <CodeSample title="prompt" text={FIRST_PROMPT} />
      <P>
        To see what that looks like before wiring anything up, run the{' '}
        <a href="/showcase/#simulator" className={LINK}>
          simulation in the showcase
        </a>
        .
      </P>
    </>
  );
}

export function QuickStart() {
  return (
    <DocSection id="quick-start" lead="Clone the repository, register the server with your MCP client, then ask a question.">
      <CloneStep />
      <RegisterStep />
      <VerifyStep />
      <AskStep />
    </DocSection>
  );
}
