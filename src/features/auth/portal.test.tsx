import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockFetch } from '@/test/mock-fetch';
import { AuthApiError } from './model/auth-api';
import { describeError } from './model/error-text';
import { navigate, safeNext } from './model/navigation';
import { PortalApp } from './ui/portal-app';
import { SessionMenu } from './ui/session-menu';

vi.mock('./model/navigation', async (original) => ({
  ...(await original<typeof import('./model/navigation')>()),
  navigate: vi.fn(),
}));

const ORIGIN = 'https://console.example';
const PASSWORD = 'violet-harbor-lantern-42';
const FRESH = { 'GET /auth/status': { body: { setupRequired: true, authenticated: false, user: null } } };
const CONFIGURED = { 'GET /auth/status': { body: { setupRequired: false, authenticated: false, user: null } } };

beforeEach(() => vi.mocked(navigate).mockClear());

describe('safeNext', () => {
  it.each([
    ['?next=/docs/', '/docs/'],
    ['?next=/docs/?tab=1&x=2#tools', '/docs/?tab=1&x=2#tools'],
    ['?next=/account/', '/account/'],
  ])('keeps the same-origin path %s', (search, expected) => {
    expect(safeNext(search, ORIGIN)).toBe(expected);
  });

  it.each([
    '',
    '?other=/docs/',
    '?next=https://evil.example/',
    '?next=//evil.example/',
    '?next=/\\evil.example/',
    '?next=\\\\evil.example',
    '?next=javascript:alert(1)',
    '?next=docs/',
    '?next=/login/',
    '?next=/setup/',
    '?next=/auth/logout',
    '?next=/portal/index.html',
    '?next=/ok\n/x',
  ])('falls back to "/" for %j', (search) => {
    expect(safeNext(search, ORIGIN)).toBe('/');
  });
});

describe('describeError', () => {
  it('explains known failures and hides unknown ones', () => {
    expect(describeError(new AuthApiError(401, { error: 'invalid_credentials' }))).toBe('Incorrect username or password.');
    expect(describeError(new AuthApiError(429, { error: 'locked', retryAfter: 900 }))).toBe('Too many attempts. Try again in 15 minutes.');
    expect(describeError(new AuthApiError(429, { error: 'locked', retryAfter: 40 }))).toBe('Too many attempts. Try again in 40 seconds.');
    expect(describeError(new AuthApiError(500, { error: 'internal_error' }))).toBe('Something went wrong. Try again.');
    expect(describeError(new TypeError('fetch failed'))).toMatch(/Could not reach the server/);
  });
});

describe('PortalApp onboarding', () => {
  it('walks a fresh install from setup token to recovery codes', async () => {
    const user = userEvent.setup();
    const calls = mockFetch({
      ...FRESH,
      'POST /auth/setup/token': { status: 204 },
      'POST /auth/setup/totp': { body: { secret: 'JBSWY3DPEHPK3PXP', uri: 'otpauth://totp/DockerBridge:admin?secret=JBSWY3DPEHPK3PXP' } },
      'POST /auth/setup/complete': { body: { recoveryCodes: ['AAAAA-BBBBB', 'CCCCC-DDDDD'] } },
    });
    render(<PortalApp />);

    await user.type(await screen.findByLabelText('Setup token'), 'abcde-fghjk-mnpqr-stvwx');
    await user.click(screen.getByRole('button', { name: 'Verify token' }));

    const account = within(await screen.findByTestId('setup-account-step'));
    const next = account.getByRole('button', { name: 'Continue' });
    await user.type(account.getByLabelText('Password'), 'short');
    expect(next).toBeDisabled();
    await user.clear(account.getByLabelText('Password'));
    await user.type(account.getByLabelText('Password'), PASSWORD);
    await user.type(account.getByLabelText('Confirm password'), PASSWORD);
    await user.click(next);

    expect(await screen.findByRole('img', { name: 'QR code for your authenticator app' })).toBeInTheDocument();
    expect(screen.getByTestId('totp-secret')).toHaveTextContent('JBSW Y3DP EHPK 3PXP');
    await user.type(screen.getByLabelText(/Code from the app/), '123456');
    await user.click(screen.getByRole('button', { name: 'Verify and create account' }));

    expect(await screen.findByText('AAAAA-BBBBB')).toBeInTheDocument();
    const open = screen.getByRole('button', { name: 'Open the dashboard' });
    expect(open).toBeDisabled();
    await user.click(screen.getByLabelText('I have stored my recovery codes'));
    await user.click(open);

    expect(navigate).toHaveBeenCalledWith('/');
    expect(calls.at(-1)).toEqual({
      key: 'POST /auth/setup/complete',
      body: { token: 'abcde-fghjk-mnpqr-stvwx', username: 'admin', password: PASSWORD, code: '123456' },
    });
  });

  it('shows why a setup token was refused', async () => {
    const user = userEvent.setup();
    mockFetch({ ...FRESH, 'POST /auth/setup/token': { status: 403, body: { error: 'invalid_token' } } });
    render(<PortalApp />);
    await user.type(await screen.findByLabelText('Setup token'), 'nope');
    await user.click(screen.getByRole('button', { name: 'Verify token' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('setup token is not correct');
  });
});

describe('PortalApp sign-in', () => {
  it('takes a password, then a second factor, then goes where it was asked', async () => {
    const user = userEvent.setup();
    const calls = mockFetch({
      ...CONFIGURED,
      'POST /auth/login': (body) => (body.password === PASSWORD ? { body: { challenge: 'c-1' } } : { status: 401, body: { error: 'invalid_credentials' } }),
      'POST /auth/login/verify': { body: { user: 'admin', usedRecoveryCode: false, recoveryCodesLeft: 10 } },
    });
    render(<PortalApp />);

    await user.type(await screen.findByLabelText('Username'), 'admin');
    await user.type(screen.getByLabelText('Password'), 'wrong-password-123');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect username or password.');

    await user.clear(screen.getByLabelText('Password'));
    await user.type(screen.getByLabelText('Password'), PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await user.type(await screen.findByLabelText(/Authenticator code/), '654321');
    await user.click(screen.getByRole('button', { name: 'Verify and sign in' }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/'));
    expect(calls.at(-1)).toEqual({ key: 'POST /auth/login/verify', body: { challenge: 'c-1', code: '654321' } });
  });

  it('offers a recovery code and reports a lockout', async () => {
    const user = userEvent.setup();
    mockFetch({
      ...CONFIGURED,
      'POST /auth/login': { body: { challenge: 'c-2' } },
      'POST /auth/login/verify': { status: 429, body: { error: 'locked', retryAfter: 900 } },
    });
    render(<PortalApp />);
    await user.type(await screen.findByLabelText('Username'), 'admin');
    await user.type(screen.getByLabelText('Password'), PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await user.click(await screen.findByRole('button', { name: 'Use a recovery code instead' }));
    await user.type(screen.getByLabelText(/Recovery code/), 'abcde-fghjk');
    await user.click(screen.getByRole('button', { name: 'Verify and sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts. Try again in 15 minutes.');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('sends an already signed-in visitor straight on, and says so when the service is down', async () => {
    mockFetch({ 'GET /auth/status': { body: { setupRequired: false, authenticated: true, user: 'admin' } } });
    const { unmount } = render(<PortalApp />);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/'));
    unmount();

    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('offline'))));
    render(<PortalApp />);
    expect(await screen.findByRole('heading', { name: 'Sign-in is unavailable' })).toBeInTheDocument();
  });
});

describe('SessionMenu', () => {
  it('shows who is signed in and signs out', async () => {
    const user = userEvent.setup();
    const calls = mockFetch({
      'GET /auth/status': { body: { setupRequired: false, authenticated: true, user: 'operator' } },
      'POST /auth/logout': { status: 204 },
    });
    render(<SessionMenu />);
    expect(await screen.findByRole('link', { name: /operator/ })).toHaveAttribute('href', '/account/');
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/login/'));
    expect(calls.map((call) => call.key)).toContain('POST /auth/logout');
  });

  it('renders nothing without a session', async () => {
    mockFetch(CONFIGURED);
    const { container } = render(<SessionMenu />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
