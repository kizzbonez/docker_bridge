export type CsvRow = Record<string, string>;

/** Splits one CSV line, honouring double-quoted cells and "" escapes. */
function splitLine(line: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line.charAt(i);
    if (quoted && char === '"' && line.charAt(i + 1) === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(cell);
      cell = '';
    } else {
      cell += char;
    }
  }
  cells.push(cell);
  return cells.map((value) => value.trim());
}

/**
 * Parses header-first CSV into records. Blank lines and `#` comment lines are
 * skipped. Cells may not span lines — enough for the datasets shipped here.
 */
export function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '' && !line.startsWith('#'));
  const [header, ...body] = lines;
  if (header === undefined) return [];
  const columns = splitLine(header);
  return body.map((line) => {
    const cells = splitLine(line);
    return Object.fromEntries(columns.map((column, index) => [column, cells[index] ?? '']));
  });
}
