const pad = (value: number): string => String(value).padStart(2, '0');

/** Wall-clock time `index * stepSeconds` after 09:10:00, as HH:MM:SS. */
export function clock(index: number, stepSeconds = 3): string {
  const total = 9 * 3600 + 10 * 60 + index * stepSeconds;
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}
