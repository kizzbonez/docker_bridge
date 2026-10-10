// Shared by the MCP server and the dashboard's simulation. Pure: no Node or
// browser APIs, so the same file runs in both.

const ESC = String.fromCharCode(27);
// CSI sequences: colours, cursor movement, erase-line.
const ANSI_SEQUENCE = new RegExp(`${ESC}\\[[0-9;?]*[A-Za-z]`, 'g');
const CHARS_PER_TOKEN = 4;

export function stripAnsi(text: string): string {
  return text.replace(ANSI_SEQUENCE, '');
}

/**
 * Rough token estimate (~4 characters per token). Good enough to budget and
 * compare payload sizes; it is not a real tokenizer.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/** Cuts text to `limit` characters, saying how much was dropped. */
export function clip(text: string, limit: number): string {
  return text.length <= limit ? text : `${text.slice(0, limit)}… [+${text.length - limit} chars]`;
}
