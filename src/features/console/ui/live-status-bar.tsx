import { StatusBar, type NavLink } from '@/features/status-bar/ui/status-bar';
import { useEngine } from '../hooks/use-console';
import type { Polled } from '../hooks/use-polling';
import type { EngineSummary } from '../model/console-api';
import { EnginePill, EngineStrip } from './engine-strip';

interface EngineStatusBarProps {
  links: NavLink[];
  engine: Polled<EngineSummary>;
}

/** The status bar reporting the real engine, for a page that already polls it. */
export function EngineStatusBar({ links, engine }: EngineStatusBarProps) {
  return <StatusBar links={links} strip={<EngineStrip engine={engine} />} pill={<EnginePill engine={engine} />} />;
}

/** The same bar for pages that have no other use for the engine: it does its own polling. */
export function LiveStatusBar({ links }: { links: NavLink[] }) {
  return <EngineStatusBar links={links} engine={useEngine()} />;
}
