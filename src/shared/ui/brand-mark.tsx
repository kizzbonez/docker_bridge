interface BrandMarkProps {
  className?: string;
}

/**
 * The DockerBridge mark: a suspension bridge whose deck carries one packet.
 * Mirrors public/brand/logo-mark.svg — keep the two in sync.
 */
export function BrandMark({ className = 'h-8 w-8' }: BrandMarkProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <rect x="2" y="2" width="60" height="60" rx="14" className="fill-carbon-900 stroke-cyan-500" strokeWidth="2" />
      <path d="M20 14v36M44 14v36" className="stroke-sky-400" strokeWidth="4" strokeLinecap="round" />
      <path
        d="M8 31 20 17Q32 41 44 17L56 31"
        fill="none"
        className="stroke-sky-400"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M26 26v16M32 29v13M38 26v16" className="stroke-sky-400/70" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 42h48" className="stroke-cyan-500" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="32" cy="42" r="3.5" className="fill-emerald-400" />
    </svg>
  );
}
