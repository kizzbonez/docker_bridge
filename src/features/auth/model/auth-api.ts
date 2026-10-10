/** Typed client for the auth service. Every call is same-origin and cookie-based. */

export interface AuthStatus {
  setupRequired: boolean;
  authenticated: boolean;
  user: string | null;
}

export interface Enrollment {
  secret: string;
  uri: string;
}

export interface SessionInfo {
  id: string;
  current: boolean;
  createdAt: string;
  lastSeenAt: string;
  ip: string;
  userAgent: string;
}

export interface ActivityEvent {
  at: string;
  type: string;
  ip: string;
  detail: string;
}

export interface AccountOverview {
  user: string;
  createdAt: string;
  passwordChangedAt: string;
  recoveryCodesLeft: number;
  sessions: SessionInfo[];
  events: ActivityEvent[];
}

interface ErrorBody {
  error?: string;
  retryAfter?: number;
  issues?: string[];
}

/** A non-2xx answer from the auth service, carrying its machine-readable code. */
export class AuthApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryAfter: number;
  readonly issues: string[];

  constructor(status: number, body: ErrorBody) {
    super(body.error ?? 'request_failed');
    this.status = status;
    this.code = body.error ?? 'request_failed';
    this.retryAfter = body.retryAfter ?? 0;
    this.issues = body.issues ?? [];
  }
}

async function request<T>(method: 'GET' | 'POST', path: string, body?: object): Promise<T> {
  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (response.status === 204) return undefined as T;
  const data: unknown = await response.json().catch(() => ({}));
  if (!response.ok) throw new AuthApiError(response.status, data as ErrorBody);
  return data as T;
}

const post = <T>(path: string, body: object = {}): Promise<T> => request<T>('POST', path, body);

export const authApi = {
  status: () => request<AuthStatus>('GET', '/auth/status'),
  login: (username: string, password: string) => post<{ challenge: string }>('/auth/login', { username, password }),
  verify: (challenge: string, code: string) =>
    post<{ user: string; usedRecoveryCode: boolean; recoveryCodesLeft: number }>('/auth/login/verify', { challenge, code }),
  logout: () => post<void>('/auth/logout'),

  setupToken: (token: string) => post<void>('/auth/setup/token', { token }),
  setupTotp: (token: string, username: string) => post<Enrollment>('/auth/setup/totp', { token, username }),
  setupComplete: (token: string, username: string, password: string, code: string) =>
    post<{ recoveryCodes: string[] }>('/auth/setup/complete', { token, username, password, code }),

  account: () => request<AccountOverview>('GET', '/auth/account'),
  revokeSession: (id: string) => post<void>('/auth/account/sessions/revoke', { id }),
  revokeOthers: () => post<{ revoked: number }>('/auth/account/sessions/revoke-others'),
  changePassword: (currentPassword: string, newPassword: string, code: string) =>
    post<void>('/auth/account/password', { currentPassword, newPassword, code }),
  regenerateCodes: (code: string) => post<{ recoveryCodes: string[] }>('/auth/account/recovery-codes', { code }),
};
