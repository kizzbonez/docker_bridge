export type AuditType =
  | 'setup_completed'
  | 'setup_token_rejected'
  | 'login_success'
  | 'login_failure'
  | 'second_factor_failure'
  | 'recovery_code_used'
  | 'lockout'
  | 'logout'
  | 'session_revoked'
  | 'sessions_revoked'
  | 'password_changed'
  | 'recovery_codes_regenerated';

export interface AuditEvent {
  at: string;
  type: AuditType;
  ip: string;
  /** Short, non-secret context such as the attempted username. */
  detail: string;
}

export interface AuditLog {
  record(type: AuditType, ip: string, detail?: string): void;
  /** Newest first. */
  recent(limit?: number): AuditEvent[];
}

interface Options {
  capacity?: number;
  now?: () => number;
  /** Receives each event as one JSON line; stdout in production. */
  sink?: (line: string) => void;
}

const MAX_DETAIL = 80;
// Strips control characters so a crafted username cannot forge log lines.
const clean = (text: string): string => [...text].filter((char) => char >= ' ' && char !== '\u007f').join('').slice(0, MAX_DETAIL);

/**
 * Security events: kept in a bounded in-memory ring for the account page and
 * written as JSON lines to the container log for anything longer term.
 */
export function createAuditLog({ capacity = 200, now = Date.now, sink = () => undefined }: Options = {}): AuditLog {
  const events: AuditEvent[] = [];
  return {
    record(type, ip, detail = '') {
      const event: AuditEvent = { at: new Date(now()).toISOString(), type, ip: clean(ip), detail: clean(detail) };
      events.push(event);
      if (events.length > capacity) events.shift();
      sink(JSON.stringify({ audit: true, ...event }));
    },
    recent: (limit = 50) => events.slice(-limit).reverse(),
  };
}
