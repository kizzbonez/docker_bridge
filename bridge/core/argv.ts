const isQuote = (char: string): boolean => char === '"' || char === "'";
const isSpace = (char: string): boolean => char === ' ' || char === '\t';

/**
 * Splits a command into the argument vector handed to the container runtime.
 * Quotes group words; nothing is expanded or interpreted, because no shell is
 * ever involved. Returns null when a quote is left open.
 */
export function splitArgv(command: string): string[] | null {
  const args: string[] = [];
  let current = '';
  let started = false;
  let quote: string | null = null;

  for (const char of command) {
    if (quote !== null) {
      if (char === quote) quote = null;
      else current += char;
    } else if (isQuote(char)) {
      quote = char;
      started = true;
    } else if (!isSpace(char)) {
      current += char;
      started = true;
    } else if (started) {
      args.push(current);
      current = '';
      started = false;
    }
  }

  if (quote !== null) return null;
  if (started) args.push(current);
  return args;
}
