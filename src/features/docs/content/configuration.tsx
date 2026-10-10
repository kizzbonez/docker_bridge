import { ENV_VARS } from '../model/facts';
import { Callout } from '../ui/callout';
import { DataTable } from '../ui/data-table';
import { DocSection } from '../ui/doc-section';
import { C, P } from '../ui/prose';

export function Configuration() {
  return (
    <DocSection id="configuration" lead="Optional environment variables, set in the env block of the server entry.">
      <DataTable caption="Environment variables" columns={['Variable', 'Value', 'Purpose']} rows={ENV_VARS} />
      <Callout kind="warning" title="The Docker socket is root-equivalent">
        Anything that can write to the Docker socket can start a privileged container and take over the host. The
        bridge never does: it has no tool that creates, stops or removes anything. Keep <C>READ_ONLY_MODE</C> on, and
        switch it off only where the agent genuinely needs the few state-changing commands the policy allows.
      </Callout>
      <P>
        The server speaks MCP over stdio: the client launches it as a child process and exchanges JSON-RPC 2.0
        messages on stdin and stdout. It opens no network port.
      </P>
    </DocSection>
  );
}
