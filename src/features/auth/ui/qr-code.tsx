import { useMemo } from 'react';
import { encode } from 'uqr';

interface QrCodeProps {
  value: string;
  label: string;
}

/** Renders a QR code as one SVG path, generated in the browser: the secret is never sent to a third party. */
export function QrCode({ value, label }: QrCodeProps) {
  const { size, path } = useMemo(() => {
    const code = encode(value, { ecc: 'M', border: 2 });
    const cells = code.data.flatMap((row, y) => row.map((dark, x) => (dark ? `M${x} ${y}h1v1h-1z` : '')));
    return { size: code.size, path: cells.join('') };
  }, [value]);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
      className="h-44 w-44 shrink-0 rounded-lg bg-white"
    >
      <path d={path} fill="#030712" />
    </svg>
  );
}
