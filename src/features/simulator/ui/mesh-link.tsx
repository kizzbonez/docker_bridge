import type { LinkState } from '@/mock-bridge/types';
import { cx } from '@/shared/lib/cx';
import { toneStroke } from '@/shared/lib/tone';
import { LINK_TONE } from './health';

// Flowing links march quickly, degraded ones crawl, broken ones stand still.
const MOTION: Record<LinkState, string> = {
  flowing: 'animate-flow',
  degraded: 'animate-flow [animation-duration:2.8s]',
  broken: 'opacity-80',
};

function Wire({ d, state }: { d: string; state: LinkState }) {
  return (
    <path
      d={d}
      fill="none"
      strokeWidth="2"
      strokeDasharray={state === 'broken' ? '2 7' : '4 4'}
      vectorEffect="non-scaling-stroke"
      className={cx(toneStroke[LINK_TONE[state]], MOTION[state])}
    />
  );
}

const SVG = 'block h-8 w-full';

interface MeshLinkProps {
  label: string;
  state: LinkState;
}

/** A straight connector between two stacked cards. */
export function MeshLink({ label, state }: MeshLinkProps) {
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" role="img" aria-label={`${label}: ${state}`} className={SVG}>
      <Wire d="M50 0V32" state={state} />
    </svg>
  );
}

interface MeshForkProps {
  left: MeshLinkProps;
  right: MeshLinkProps;
}

/** One parent fanning out to the two cards in the row below. */
export function MeshFork({ left, right }: MeshForkProps) {
  const label = `${left.label}: ${left.state}; ${right.label}: ${right.state}`;
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" role="img" aria-label={label} className={SVG}>
      <Wire d="M50 0V16H25V32" state={left.state} />
      <Wire d="M50 0V16H75V32" state={right.state} />
    </svg>
  );
}
