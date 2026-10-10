import type { HTMLAttributes } from 'react';
import { cx } from '@/shared/lib/cx';

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds the cyan border + glow on hover. */
  hover?: boolean;
}

/**
 * The shared glass surface with HUD corner brackets. Do not add overflow-hidden
 * here — it would clip the brackets; clip an inner wrapper instead.
 */
export function GlassPanel({ hover = false, className, ...rest }: GlassPanelProps) {
  return <div className={cx('glass hud-corners', hover && 'glass-hover', className)} {...rest} />;
}
