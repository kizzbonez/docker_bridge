// stripAnsi is the MCP server's own implementation, so the UI sanitises
// exactly as the real tool does.
export { stripAnsi } from '@bridge/core/text';

export const ESC = String.fromCharCode(27);
const ESC_ALL = new RegExp(ESC, 'g');

/** Wraps text in an SGR colour code, the way a CLI logger would. */
export function paint(code: number, text: string): string {
  return `${ESC}[${code}m${text}${ESC}[0m`;
}

/** Makes escape bytes visible ("␛[31m") so raw logs can be shown on screen. */
export function revealAnsi(text: string): string {
  return text.replace(ESC_ALL, '␛');
}
