import { CONSOLE_ENV_VARS } from '../model/facts';
import { Callout } from '../ui/callout';
import { DataTable } from '../ui/data-table';
import { DocSection } from '../ui/doc-section';
import { Bullets, C, H3, P } from '../ui/prose';

const SHOWS = [
  <>
    <strong className="text-ink">Engine status.</strong> Version, how many containers are running, and how the bridge is
    configured, in the bar at the top of every page.
  </>,
  <>
    <strong className="text-ink">Stacks.</strong> Each compose project as <C>docker_get_stack_topology</C> reports it:
    health, restarts, CPU and memory per service, refreshed every few seconds.
  </>,
  <>
    <strong className="text-ink">Inspect.</strong> <C>docker_tail_filtered_logs</C> and <C>docker_safe_exec</C> against a
    container you pick, with the real token count the filter saved.
  </>,
  <>
    <strong className="text-ink">Activity.</strong> Every call an MCP client made through the server, with the client&apos;s
    name, and every log or command run from the console.
  </>,
];

const LIMITS = [
  <>
    It is the only container given the Docker socket. It publishes no port: nginx forwards <C>/api/</C> to it for a
    signed-in session only, and it asks the auth service again itself before answering.
  </>,
  <>
    It offers the same three tools an agent gets, through the same validation and exec policy. There is no call that
    starts, stops, creates or removes anything.
  </>,
  <>
    It never runs a command in its own compose project, where the sign-in secrets live, and runs none at all if it
    cannot tell which project that is.
  </>,
  <>
    Every log read and command run from the browser is written to its container log as an audit line. What the tool
    returned is not.
  </>,
];

export function Console() {
  return (
    <DocSection id="console" lead="The page you land on after signing in: the Docker Engine on this machine, read live through the bridge.">
      <P>
        The console is where the real data is. It runs the same code as the MCP server, so what it shows is exactly
        what an agent would be given. The showcase, by contrast, is a simulation and says so.
      </P>
      <Bullets items={SHOWS} />

      <H3>The activity log</H3>
      <P>
        The MCP server appends one line per tool call to <C>data/activity/calls.jsonl</C> in the repository: when, which
        client, which tool and target, the command or filter pattern, how it went, how long it took and the token
        counts. It never stores what a tool returned. The console reads that folder through a read-only mount. Set{' '}
        <C>DOCKER_BRIDGE_ACTIVITY=off</C> in a client&apos;s server entry to stop recording.
      </P>

      <H3>What the console can and cannot do</H3>
      <Bullets items={LIMITS} />
      <Callout kind="warning" title="This is real access to your containers">
        Anyone signed in can read container logs and run the allowlisted diagnostics, which include reading files and
        querying local databases. Keep the sign-in strong, and if you publish the site, consider a second gate in
        front of it. To run the site without any Docker access, start it with{' '}
        <C>docker compose up -d --scale console=0</C>.
      </Callout>
      <DataTable caption="Console settings" columns={['Variable', 'Default', 'Purpose']} rows={CONSOLE_ENV_VARS} />
    </DocSection>
  );
}
