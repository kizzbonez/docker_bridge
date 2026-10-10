const INTEGER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function formatInt(value: number): string {
  return INTEGER.format(Math.round(value));
}

/** Amounts under a dollar keep four decimals so "$0.0010" does not round to "$0.00". */
export function formatUsd(value: number): string {
  return value < 1 ? `$${value.toFixed(4)}` : `$${value.toFixed(2)}`;
}

export function formatPercent(ratio: number, digits = 0): string {
  return `${(ratio * 100).toFixed(digits)}%`;
}
