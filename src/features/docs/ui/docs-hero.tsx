import { GlassPanel } from '@/shared/ui/glass-panel';

const SHORTCUTS = [
  { href: '#quick-start', kicker: '2 min', title: 'Quick start', body: 'Register the server with Claude Code.' },
  { href: '#tools-reference', kicker: 'Reference', title: 'Three tools', body: 'Parameters, schemas and sample payloads.' },
  { href: '#guardrails', kicker: 'Safety', title: 'Guardrails', body: 'What is allowed, refused, and why.' },
  { href: '#run-dashboard', kicker: 'Operate', title: 'Run this dashboard', body: 'Docker, tests and security scans.' },
];

/** Page header with jump-off cards for the most common destinations. */
export function DocsHero() {
  return (
    <header className="mx-auto w-full max-w-7xl px-4 pt-12 pb-10 sm:px-6 lg:pt-16">
      <p className="eyebrow">
        <span className="text-ink-mute">docs //</span> DockerBridge MCP
      </p>
      <h1 className="mt-4 font-display text-4xl leading-tight font-semibold tracking-tight text-ink sm:text-5xl">
        Documentation
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-dim">
        How the bridge is wired into Claude Code, what each tool accepts and returns, which commands the guardrails
        refuse, and how to run and verify this dashboard.
      </p>
      <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SHORTCUTS.map((shortcut) => (
          <li key={shortcut.href}>
            <GlassPanel hover className="relative h-full p-4">
              <p className="font-mono text-[11px] tracking-widest text-emerald-400 uppercase">{shortcut.kicker}</p>
              <a href={shortcut.href} className="mt-1 block font-display text-lg font-semibold text-ink after:absolute after:inset-0">
                {shortcut.title}
              </a>
              <p className="mt-1 text-sm text-ink-dim">{shortcut.body}</p>
            </GlassPanel>
          </li>
        ))}
      </ul>
    </header>
  );
}
