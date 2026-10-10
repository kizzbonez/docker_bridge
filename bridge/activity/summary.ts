import type { ActivityRecord } from './record.ts';

export interface ActivityTotals {
  calls: number;
  refused: number;
  failed: number;
  /** Log tails only: what the raw tails would have cost against what was returned. */
  tokens: { raw: number; returned: number; saved: number };
  /** Distinct clients seen, most recent first. */
  clients: string[];
}

export function summarize(records: ActivityRecord[]): ActivityTotals {
  const tokens = { raw: 0, returned: 0, saved: 0 };
  for (const record of records) {
    if (record.tokens.raw === null) continue;
    tokens.raw += record.tokens.raw;
    tokens.returned += record.tokens.returned;
    tokens.saved += Math.max(0, record.tokens.raw - record.tokens.returned);
  }
  const newestFirst = [...records].sort((a, b) => b.at.localeCompare(a.at));
  return {
    calls: records.length,
    refused: records.filter((record) => record.outcome === 'refused').length,
    failed: records.filter((record) => record.outcome === 'error' || record.outcome === 'invalid').length,
    tokens,
    clients: [...new Set(newestFirst.map((record) => record.client))],
  };
}
