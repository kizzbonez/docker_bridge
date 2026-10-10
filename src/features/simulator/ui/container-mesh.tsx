import { useMemo, useState } from 'react';
import { PROJECT } from '@/mock-bridge/fleet';
import { CONTAINER_IDS, type ContainerId, type MeshState } from '@/mock-bridge/types';
import { usePulse } from '@/shared/hooks/use-pulse';
import { Badge } from '@/shared/ui/badge';
import { GlassPanel } from '@/shared/ui/glass-panel';
import { jitterMesh } from '../model/derive-mesh';
import { ContainerCard } from './container-card';
import { ContainerInspector } from './container-inspector';
import { MeshFork, MeshLink } from './mesh-link';

const REFRESH_MS = 1400;

function MeshHeader({ mesh }: { mesh: MeshState }) {
  const unhealthy = CONTAINER_IDS.filter((id) => mesh.containers[id].health !== 'healthy').length;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/15 px-4 py-2.5">
      <p className="font-mono text-xs text-ink-mute">
        compose project <span className="text-ink">{PROJECT}</span> · {CONTAINER_IDS.length} services
      </p>
      <Badge tone={unhealthy === 0 ? 'ok' : 'crit'}>{unhealthy === 0 ? 'all healthy' : `${unhealthy} unhealthy`}</Badge>
    </div>
  );
}

/** Right pane: the live container topology, driven by the simulator. */
export function ContainerMesh({ mesh }: { mesh: MeshState }) {
  const tick = usePulse(REFRESH_MS);
  const live = useMemo(() => jitterMesh(mesh, tick), [mesh, tick]);
  const [selected, setSelected] = useState<ContainerId>('order-api');
  const card = (id: ContainerId) => (
    <ContainerCard container={live.containers[id]} selected={selected === id} onSelect={setSelected} />
  );

  return (
    <GlassPanel data-testid="container-mesh">
      <MeshHeader mesh={mesh} />
      <div className="p-3 sm:p-4">
        <div className="mx-auto max-w-xs">{card('web-gateway')}</div>
        <MeshLink label="web-gateway to order-api" state={mesh.links['gateway-api']} />
        <div className="mx-auto max-w-xs">{card('order-api')}</div>
        <MeshFork
          left={{ label: 'order-api to cache-redis', state: mesh.links['api-redis'] }}
          right={{ label: 'order-api to db-postgres', state: mesh.links['api-postgres'] }}
        />
        <div className="grid grid-cols-2 gap-3">
          {card('cache-redis')}
          {card('db-postgres')}
        </div>
      </div>
      <ContainerInspector container={live.containers[selected]} />
    </GlassPanel>
  );
}
