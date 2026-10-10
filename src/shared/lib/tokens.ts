const CHARS_PER_TOKEN = 4;

/**
 * Rough token estimate (~4 characters per token). Good enough to compare
 * payload sizes; it is not a real tokenizer.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}
