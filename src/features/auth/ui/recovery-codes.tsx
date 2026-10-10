import { useMemo } from 'react';
import { LinkButton } from '@/shared/ui/button';
import { CopyButton } from '@/shared/ui/copy-button';

function fileText(codes: string[]): string {
  return [
    'DockerBridge recovery codes',
    'Each code signs you in once if you lose your authenticator. Keep them offline.',
    '',
    ...codes,
    '',
  ].join('\n');
}

/** Shows freshly issued recovery codes once, with copy and download. */
export function RecoveryCodes({ codes }: { codes: string[] }) {
  const text = useMemo(() => fileText(codes), [codes]);
  const href = useMemo(() => `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`, [text]);
  return (
    <div className="space-y-3">
      <ul
        data-testid="recovery-codes"
        className="grid grid-cols-2 gap-2 rounded-lg border border-cyan-500/20 bg-carbon-950/70 p-3 font-mono text-sm text-ink"
      >
        {codes.map((code) => (
          <li key={code} className="text-center tracking-wider">
            {code}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <CopyButton text={codes.join('\n')} label="Copy codes" copiedLabel="Copied" className="px-3 py-1.5 text-xs" />
        <LinkButton href={href} download="dockerbridge-recovery-codes.txt" className="px-3 py-1.5 text-xs">
          ⤓ Download .txt
        </LinkButton>
      </div>
    </div>
  );
}
