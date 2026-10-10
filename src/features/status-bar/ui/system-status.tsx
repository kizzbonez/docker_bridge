import { usePulse } from '@/shared/hooks/use-pulse';
import { noise } from '@/shared/lib/noise';
import { Badge } from '@/shared/ui/badge';
import { StatusDot } from '@/shared/ui/status-dot';

const BASE_LATENCY_MS = 12;
const LATENCY_SWING_MS = 3;

/** Round-trip latency that wanders a few milliseconds every two seconds. */
function useLatency(): number {
  const tick = usePulse(2000);
  return Math.round(BASE_LATENCY_MS + noise(tick, 3) * LATENCY_SWING_MS);
}

/**
 * Full system readout, shown once at the very top of the page. The server is
 * simulated, which the last pill says plainly.
 */
export function SystemStrip() {
  const latency = useLatency();
  return (
    <section aria-label="System status" className="border-b border-cyan-500/10 bg-carbon-950/70">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-1.5 sm:px-6">
        <Badge tone="ok">
          <StatusDot tone="ok" ping />
          MCP Server: ACTIVE <span className="text-ink-mute">(stdio: /var/run/docker.sock)</span>
        </Badge>
        <Badge tone="signal">Protocol: MCP v1.0</Badge>
        <Badge tone="signal">
          <span className="text-ink-mute">latency</span>
          <span data-testid="latency" className="tabular-nums">
            {latency}ms
          </span>
        </Badge>
        <Badge tone="mute" className="sm:ml-auto">
          simulated data
        </Badge>
      </div>
    </section>
  );
}

/** Compact live indicator that stays in the sticky bar while scrolling (desktop only). */
export function LivePill() {
  const latency = useLatency();
  // The wrapper carries the breakpoint: Badge sets its own display, which would win over `hidden`.
  return (
    <span className="hidden lg:block">
      <Badge tone="ok">
        <StatusDot tone="ok" ping />
        MCP ACTIVE
        <span className="text-ink-mute tabular-nums">{latency}ms</span>
      </Badge>
    </span>
  );
}
