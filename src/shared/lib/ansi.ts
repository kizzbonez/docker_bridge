export const ESC = String.fromCharCode(27);

// Built from a string so the source file holds no raw control characters.
const ANSI_SEQUENCE = new RegExp(`${ESC}\\[[0-9;]*[A-Za-z]`, 'g');
const ESC_ALL = new RegExp(ESC, 'g');

export function stripAnsi(text: string): string {
  return text.replace(ANSI_SEQUENCE, '');
}

export function countAnsi(text: string): number {
  return text.match(ANSI_SEQUENCE)?.length ?? 0;
}

/** Wraps text in an SGR colour code, the way a CLI logger would. */
export function paint(code: number, text: string): string {
  return `${ESC}[${code}m${text}${ESC}[0m`;
}

/** Makes escape bytes visible ("␛[31m") so raw logs can be shown on screen. */
export function revealAnsi(text: string): string {
  return text.replace(ESC_ALL, '␛');
}
