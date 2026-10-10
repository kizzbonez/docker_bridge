import { BrandMark } from './brand-mark';

/** Mark + wordmark + protocol chip. */
export function BrandLockup() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <BrandMark className="h-8 w-8 shrink-0" />
      <span className="font-display text-lg font-semibold tracking-wide text-ink">
        Docker<span className="text-sky-400">Bridge</span>
      </span>
      <span className="hidden rounded border border-cyan-500/40 px-1.5 py-0.5 font-mono text-[10px] tracking-[0.2em] text-cyan-300 sm:inline-block">
        MCP
      </span>
    </span>
  );
}
