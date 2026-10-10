import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountApp } from '@/app/account-app';
import { navigate } from '@/features/auth/model/navigation';
import { PasswordPolicyMeter } from '@/features/auth/ui/password-policy-meter';
import { mockFetch } from '@/test/mock-fetch';
import { describeAgent, describeEvent, formatTime } from './model/describe';

vi.mock('@/features/auth/model/navigation', async (original) => ({
  ...(await original<typeof import('@/features/auth/model/navigation')>()),
  navigate: vi.fn(),
}));

const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
const STATUS = { 'GET /auth/status': { body: { setupRequired: false, authenticated: true, user: 'operator' } } };

const overview = {
  user: 'operator',
  createdAt: '2026-10-10T08:00:00.000Z',
  passwordChangedAt: '2026-10-10T08:00:00.000Z',
  recoveryCodesLeft: 2,
  sessions: [
    { id: 'aaa111', current: true, createdAt: '2026-10-10T09:00:00.000Z', lastSeenAt: '2026-10-10T09:30:00.000Z', ip: '10.0.0.5', userAgent: CHROME },
    { id: 'bbb222', current: false, createdAt: '2026-10-09T09:00:00.000Z', lastSeenAt: '2026-10-09T10:00:00.000Z', ip: '10.0.0.9', userAgent: 'curl/8.9' },
  ],
  events: [
    { at: '2026-10-10T09:00:00.000Z', type: 'login_success', ip: '10.0.0.5', detail: 'operator' },
    { at: '2026-10-10T08:59:00.000Z', type: 'lockout', ip: '203.0.113.7', detail: 'root' },
  ],
};

beforeEach(() => vi.mocked(navigate).mockClear());

describe('describe helpers', () => {
  it('summarises user agents', () => {
    expect(describeAgent(CHROME)).toBe('Chrome on Windows');
    expect(describeAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile Safari/604.1')).toBe('Safari on iOS');
    expect(describeAgent('Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0')).toBe('Firefox on Linux');
    expect(describeAgent('curl/8.9')).toBe('curl/8.9');
    expect(describeAgent('')).toBe('Unknown device');
  });

  it('labels events and formats times defensively', () => {
    expect(describeEvent('lockout')).toEqual({ label: 'Locked out', tone: 'crit' });
    expect(describeEvent('something_new')).toEqual({ label: 'something_new', tone: 'mute' });
    expect(formatTime('not a date')).toBe('—');
    expect(formatTime('2026-10-10T09:00:00.000Z')).toMatch(/2026/);
  });
});

describe('PasswordPolicyMeter', () => {
  it('ticks off each rule as the password satisfies it', () => {
    const { rerender } = render(<PasswordPolicyMeter password="" username="operator" />);
    expect(screen.getAllByText(/\(not met\)/)).toHaveLength(4);
    rerender(<PasswordPolicyMeter password="violet-harbor-lantern-42" username="operator" />);
    expect(screen.getAllByText(/\(met\)/)).toHaveLength(4);
    expect(screen.getByText('Excellent')).toBeInTheDocument();
    rerender(<PasswordPolicyMeter password="operator-operator-1" username="operator" />);
    expect(screen.getByText('Does not contain your username').closest('li')).toHaveTextContent('(not met)');
  });
});

describe('AccountApp', () => {
  it('shows the account, its sessions and its activity', async () => {
    mockFetch({ ...STATUS, 'GET /auth/account': { body: overview } });
    render(<AccountApp />);

    const summary = within(await screen.findByTestId('panel-summary'));
    expect(summary.getByText('operator')).toBeInTheDocument();
    expect(summary.getByText('2 of 10 left')).toBeInTheDocument();

    const sessions = within(screen.getByTestId('panel-sessions'));
    expect(sessions.getByText('Chrome on Windows')).toBeInTheDocument();
    expect(sessions.getByText('this device')).toBeInTheDocument();
    expect(sessions.getAllByRole('button', { name: 'Revoke' })).toHaveLength(1);

    const activity = within(screen.getByTestId('panel-activity'));
    expect(activity.getByText('Locked out')).toBeInTheDocument();
    expect(activity.getByText('203.0.113.7')).toBeInTheDocument();
  });

  it('revokes a session and reloads the list', async () => {
    const user = userEvent.setup();
    const calls = mockFetch({
      ...STATUS,
      'GET /auth/account': { body: overview },
      'POST /auth/account/sessions/revoke': { status: 204 },
      'POST /auth/account/sessions/revoke-others': { body: { revoked: 1 } },
    });
    render(<AccountApp />);
    await user.click(await screen.findByRole('button', { name: 'Revoke' }));
    await waitFor(() => expect(calls.filter((call) => call.key === 'GET /auth/account')).toHaveLength(2));
    expect(calls).toContainEqual({ key: 'POST /auth/account/sessions/revoke', body: { id: 'bbb222' } });

    await user.click(screen.getByRole('button', { name: 'Sign out other sessions' }));
    await waitFor(() => expect(calls.map((call) => call.key)).toContain('POST /auth/account/sessions/revoke-others'));
  });

  it('changes the password only with a strong new one and a code', async () => {
    const user = userEvent.setup();
    const calls = mockFetch({ ...STATUS, 'GET /auth/account': { body: overview }, 'POST /auth/account/password': { status: 204 } });
    render(<AccountApp />);
    const panel = within(await screen.findByTestId('panel-password'));
    const submit = panel.getByRole('button', { name: 'Change password' });

    await user.type(panel.getByLabelText('Current password'), 'violet-harbor-lantern-42');
    await user.type(panel.getByLabelText('New password'), 'weak');
    await user.type(panel.getByLabelText(/Authenticator code/), '123456');
    expect(submit).toBeDisabled();

    await user.clear(panel.getByLabelText('New password'));
    await user.type(panel.getByLabelText('New password'), 'saffron-meadow-compass-77');
    await user.click(submit);
    expect(await panel.findByRole('status')).toHaveTextContent('Password changed.');
    expect(calls).toContainEqual({
      key: 'POST /auth/account/password',
      body: { currentPassword: 'violet-harbor-lantern-42', newPassword: 'saffron-meadow-compass-77', code: '123456' },
    });
  });

  it('shows freshly generated recovery codes, or the reason they were refused', async () => {
    const user = userEvent.setup();
    let attempt = 0;
    mockFetch({
      ...STATUS,
      'GET /auth/account': { body: overview },
      'POST /auth/account/recovery-codes': () => {
        attempt += 1;
        return attempt === 1 ? { status: 401, body: { error: 'invalid_code' } } : { body: { recoveryCodes: ['NEWAA-NEWBB'] } };
      },
    });
    render(<AccountApp />);
    const panel = within(await screen.findByTestId('panel-recovery'));
    await user.type(panel.getByLabelText(/Authenticator code/), '000000');
    await user.click(panel.getByRole('button', { name: 'Generate new codes' }));
    expect(await panel.findByRole('alert')).toHaveTextContent('code is not valid');

    await user.click(panel.getByRole('button', { name: 'Generate new codes' }));
    expect(await panel.findByText('NEWAA-NEWBB')).toBeInTheDocument();
  });

  it('returns to sign-in when the session has ended, and reports an outage', async () => {
    mockFetch({ ...STATUS, 'GET /auth/account': { status: 401, body: { error: 'unauthenticated' } } });
    const { unmount } = render(<AccountApp />);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/login/?next=/account/'));
    unmount();

    mockFetch({ ...STATUS, 'GET /auth/account': { status: 500, body: { error: 'internal_error' } } });
    render(<AccountApp />);
    expect(await screen.findByRole('alert')).toHaveTextContent('account service did not answer');
  });
});
