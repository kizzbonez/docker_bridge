import type { ContainerState } from '@/mock-bridge/types';

function Fact({ term, value }: { term: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-ink-mute">{term}</dt>
      <dd className="truncate text-ink-dim" title={value}>
        {value}
      </dd>
    </div>
  );
}

function lastExit(container: ContainerState): string {
  return container.exitCode === null ? 'none' : `${container.exitCode} (${container.exitReason})`;
}

/** `docker inspect` highlights for the selected container. */
export function ContainerInspector({ container }: { container: ContainerState }) {
  return (
    <div data-testid="container-inspector" className="border-t border-cyan-500/15 bg-carbon-950/50 p-4">
      <p className="mb-3 font-mono text-xs text-sky-300">
        <span className="text-ink-mute">$ docker inspect</span> {container.id}
      </p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 font-mono text-[11px] sm:grid-cols-3">
        <Fact term="image" value={container.image} />
        <Fact term="role" value={container.role} />
        <Fact term="ports" value={container.ports} />
        <Fact term="uptime" value={container.uptime} />
        <Fact term="restarts" value={String(container.restarts)} />
        <Fact term="last exit" value={lastExit(container)} />
        <Fact term="depends on" value={container.dependsOn.join(', ') || 'nothing'} />
      </dl>
    </div>
  );
}
