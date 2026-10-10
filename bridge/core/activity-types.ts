// Shapes shared by the MCP server, the console service and the console page.
// Types only: importing this file pulls in no Node or browser code.

export const ACTIVITY_OUTCOMES = ['ok', 'refused', 'error', 'invalid'] as const;
export type ActivityOutcome = (typeof ACTIVITY_OUTCOMES)[number];

/**
 * One tool call, as kept in the activity log. It says who asked for what and
 * how it went. It never holds what the tool returned.
 */
export interface ActivityRecord {
  at: string;
  /** The MCP client's own name and version, e.g. "claude-code 2.1.0". */
  client: string;
  tool: string;
  /** The container or compose project the call was aimed at. */
  target: string;
  /** The command or filter pattern, clipped. */
  detail: string;
  outcome: ActivityOutcome;
  ms: number;
  /** `raw` is what the unfiltered log tail would have cost; null for tools that filter nothing. */
  tokens: { raw: number | null; returned: number };
}

export interface ActivityTotals {
  calls: number;
  refused: number;
  failed: number;
  /** Log tails only: what the raw tails would have cost against what was returned. */
  tokens: { raw: number; returned: number; saved: number };
  /** Distinct clients seen, most recent first. */
  clients: string[];
}
