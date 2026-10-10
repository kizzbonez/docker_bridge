import { CONTAINER_IDS, type ContainerId } from '@/mock-bridge/types';
import { parseCsv, type CsvRow } from '@/shared/lib/csv';
import csvText from '../data/token-economy.csv?raw';

export interface Benchmark {
  id: string;
  label: string;
  container: ContainerId;
  filterPattern: string;
  rawLines: number;
  rawTokens: number;
  ansiSequences: number;
  duplicateLines: number;
  bridgedLines: number;
  bridgedTokens: number;
}

function isContainerId(value: string | undefined): value is ContainerId {
  return (CONTAINER_IDS as readonly string[]).includes(value ?? '');
}

const count = (row: CsvRow, column: string): number => Number(row[column] ?? Number.NaN);

function toBenchmark(row: CsvRow): Benchmark | null {
  const benchmark = {
    id: row.scenario_id ?? '',
    label: row.label ?? '',
    container: row.container,
    filterPattern: row.filter_pattern ?? '',
    rawLines: count(row, 'raw_lines'),
    rawTokens: count(row, 'raw_tokens'),
    ansiSequences: count(row, 'ansi_sequences'),
    duplicateLines: count(row, 'duplicate_lines'),
    bridgedLines: count(row, 'bridged_lines'),
    bridgedTokens: count(row, 'bridged_tokens'),
  };
  const numbers = [benchmark.rawLines, benchmark.rawTokens, benchmark.bridgedLines, benchmark.bridgedTokens];
  const valid = benchmark.id !== '' && isContainerId(benchmark.container) && numbers.every((n) => n > 0);
  return valid ? (benchmark as Benchmark) : null;
}

/** Rows that fail validation are dropped rather than rendered as NaN. */
export function toBenchmarks(text: string): Benchmark[] {
  return parseCsv(text).flatMap((row) => toBenchmark(row) ?? []);
}

export const BENCHMARKS: Benchmark[] = toBenchmarks(csvText);
