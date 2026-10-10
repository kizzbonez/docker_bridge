import { ENV_VARS } from '../model/facts';
import { Callout } from '../ui/callout';
import { DataTable } from '../ui/data-table';
import { DocSection } from '../ui/doc-section';
import { C, P } from '../ui/prose';

export function Configuration() {
  return (
    <DocSection id="configuration" lead="Two environment variables, set in the env block of the server entry.">
      <DataTable caption="Environment variables" columns={['Variable', 'Value', 'Purpose']} rows={ENV_VARS} />
      <Callout kind="warning" title="The Docker socket is root-equivalent">
        Anything that can write to <C>/var/run/docker.sock</C> can start a privileged container and take over the host.
        Start with <C>READ_ONLY_MODE</C> set to <C>"true"</C>, and switch it off only for projects where the agent
        genuinely needs to change runtime state.
      </Callout>
      <P>
        The server speaks MCP over stdio: Claude Code launches it as a child process and exchanges JSON-RPC 2.0
        messages on stdin and stdout. It opens no network port.
      </P>
    </DocSection>
  );
}
