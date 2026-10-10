const HEADER_BYTES = 8;
const STDERR = 2;

export interface Demuxed {
  stdout: string;
  stderr: string;
  /** Both streams interleaved in the order the engine sent them. */
  combined: string;
}

/**
 * Splits Docker's multiplexed stream. Unless a container has a TTY, log and
 * exec output arrives as frames: one byte for the stream, three zero bytes,
 * a big-endian length, then the payload. A final frame cut short by a size
 * limit is kept as far as it goes.
 */
export function demux(buffer: Buffer): Demuxed {
  const out: Buffer[] = [];
  const err: Buffer[] = [];
  const all: Buffer[] = [];
  let offset = 0;

  while (offset + HEADER_BYTES <= buffer.length) {
    const size = buffer.readUInt32BE(offset + 4);
    const payload = buffer.subarray(offset + HEADER_BYTES, offset + HEADER_BYTES + size);
    (buffer[offset] === STDERR ? err : out).push(payload);
    all.push(payload);
    offset += HEADER_BYTES + size;
  }

  const text = (parts: Buffer[]): string => Buffer.concat(parts).toString('utf8');
  return { stdout: text(out), stderr: text(err), combined: text(all) };
}

/** Log text as lines, without the trailing empty line a final newline leaves behind. */
export function toLines(text: string): string[] {
  const lines = text.split(/\r?\n/);
  if (lines.at(-1) === '') lines.pop();
  return lines;
}
