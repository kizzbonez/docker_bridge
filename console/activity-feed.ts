import { readActivity } from '../bridge/activity/log.ts';
import type { ActivityRecord } from '../bridge/activity/record.ts';
import { summarize, type ActivityTotals } from '../bridge/activity/summary.ts';

/** How much of the agents' log is read, and how many calls a page shows. */
const WINDOW = 300;
const SHOWN = 100;
/** Calls made from the browser are kept in memory only, and in the container log. */
const OWN_KEPT = 100;

export interface ActivityView {
  /** Newest first. */
  calls: ActivityRecord[];
  /** Over the whole window, not just the calls shown. */
  totals: ActivityTotals;
  /** How many calls the totals cover. */
  window: number;
}

export interface ActivityFeed {
  /** Records a call made through the console itself. */
  note(record: ActivityRecord): void;
  read(): Promise<ActivityView>;
}

/**
 * One timeline from two sources: what agents did, read from the MCP server's
 * log on disk, and what was run from this console.
 */
export function createActivityFeed(dir: string | null, audit: (line: string) => void): ActivityFeed {
  const own: ActivityRecord[] = [];
  return {
    note(record) {
      own.push(record);
      if (own.length > OWN_KEPT) own.shift();
      audit(JSON.stringify({ level: 'audit', ...record }));
    },
    async read() {
      const agents = dir === null ? [] : await readActivity(dir, WINDOW);
      const all = [...agents, ...own].sort((a, b) => b.at.localeCompare(a.at));
      return { calls: all.slice(0, SHOWN), totals: summarize(all), window: all.length };
    },
  };
}
