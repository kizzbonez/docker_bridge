import type { ReactNode } from 'react';

interface WindowChromeProps {
  title: string;
  /** Right-aligned slot, e.g. a run status. */
  aside?: ReactNode;
}

/** macOS-style title bar with traffic-light dots. */
export function WindowChrome({ title, aside }: WindowChromeProps) {
  return (
    <div className="flex items-center gap-3 border-b border-cyan-500/15 bg-carbon-950/70 px-4 py-2.5">
      <span className="flex gap-1.5" aria-hidden="true">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
      </span>
      <span className="min-w-0 flex-1 truncate text-center font-mono text-xs text-ink-mute">{title}</span>
      <span className="font-mono text-[11px] text-ink-mute">{aside}</span>
    </div>
  );
}
