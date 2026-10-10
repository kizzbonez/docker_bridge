import { AuthApiError } from './auth-api';

const MESSAGES: Record<string, string> = {
  invalid_credentials: 'Incorrect username or password.',
  invalid_code: 'That code is not valid. Check your authenticator app and try again.',
  challenge_expired: 'This sign-in attempt expired. Enter your password again.',
  invalid_token: 'That setup token is not correct. Copy it again from the server logs.',
  invalid_username: 'Usernames are 3–32 characters: letters, digits, dot, dash or underscore.',
  weak_password: 'That password does not meet the requirements below.',
  already_configured: 'Setup has already been completed. Sign in instead.',
  setup_required: 'This installation has not been set up yet.',
  enrollment_not_started: 'Authenticator enrollment expired. Go back one step and try again.',
  session_not_found: 'That session has already ended.',
  unauthenticated: 'Your session has ended. Sign in again.',
  cross_site_request: 'The request was blocked. Reload the page and try again.',
};

function waitText(seconds: number): string {
  if (seconds < 90) return `${Math.max(1, seconds)} seconds`;
  return `${Math.ceil(seconds / 60)} minutes`;
}

/** Turns anything thrown by the auth client into a sentence a person can act on. */
export function describeError(error: unknown): string {
  if (!(error instanceof AuthApiError)) return 'Could not reach the server. Check your connection and try again.';
  if (error.code === 'locked') return `Too many attempts. Try again in ${waitText(error.retryAfter)}.`;
  return MESSAGES[error.code] ?? 'Something went wrong. Try again.';
}
