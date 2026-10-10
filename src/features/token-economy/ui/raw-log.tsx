import { revealAnsi } from '@/shared/lib/ansi';

const VISIBLE_ESCAPE = /(␛\[[0-9;]*[A-Za-z])/;

/** Raw log lines with their ANSI escapes made visible and tinted red. */
export function RawLog({ lines }: { lines: string[] }) {
  return lines.map((line, row) => (
    <span key={row} className="block">
      {revealAnsi(line)
        .split(VISIBLE_ESCAPE)
        .map((part, index) => (
          <span key={index} className={VISIBLE_ESCAPE.test(part) ? 'text-red-400' : 'text-ink-mute'}>
            {part}
          </span>
        ))}
    </span>
  ));
}
