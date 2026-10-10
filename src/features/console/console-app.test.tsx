import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConsoleApp } from '@/app/console-app';
import { navigate } from '@/features/auth/model/navigation';
import { BRIDGE, ENGINE, NO_ACTIVITY, mockBackend, toolReply } from './test-fixtures';

vi.mock('@/features/auth/model/navigation', async (original) => ({
  ...(await original<typeof import('@/features/auth/model/navigation')>()),
  navigate: vi.fn(),
}));

beforeEach(() => vi.mocked(navigate).mockClear());

const service = (name: string) => screen.findByTestId(`service-${name}`);

describe('ConsoleApp', () => {
  it('shows the real engine in the status bar and in four numbers', async () => {
    mockBackend();
    render(<ConsoleApp />);
    const status = within(screen.getByRole('region', { name: 'Engine status' }));
    expect(await status.findByText(/Docker Engine 29\.8\.0/)).toHaveTextContent('(Docker Desktop)');
    expect(status.getByTestId('running-count')).toHaveTextContent('6 / 7');
    expect(status.getByText('bridge: read-only')).toBeInTheDocument();
    expect(status.getByText('live data')).toBeInTheDocument();
    expect(screen.queryByText('simulated data')).toBeNull();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Your Docker Engine, as your agents see it.');
    const overview = screen.getByTestId('overview');
    await waitFor(() => expect(overview).toHaveTextContent('Containers running6of 7 containers visible'));
    expect(overview).toHaveTextContent('Compose projects2and 1 standalone container');
    expect(overview).toHaveTextContent('Tool calls on record22 clients · 1 refused');
    expect(overview).toHaveTextContent('Tokens kept out of context18,08098% of what the raw log tails cost');
  });

  it('opens on a project that is not its own stack, with health and metrics per service', async () => {
    mockBackend();
    render(<ConsoleApp />);
    expect(await screen.findByRole('tab', { name: 'shop 2/3' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'docker-bridge 3/3' })).toHaveAttribute('aria-selected', 'false');

    const web = within(await service('web'));
    expect(web.getByText('healthy')).toBeInTheDocument();
    expect(web.getByText('library/nginx:1.30')).toBeInTheDocument();
    expect(web.getByRole('meter', { name: 'web memory in MiB' })).toHaveAttribute('aria-valuenow', '48');
    expect(web.getByText('needs api')).toBeInTheDocument();

    const api = await service('api');
    expect(api).toHaveAttribute('data-health', 'unhealthy');
    expect(api).toHaveTextContent('300 MiB · no limit');
    expect(api).toHaveTextContent('image 0123456789ab');
    expect(await service('cache')).toHaveTextContent('ExitCode: 137 (OOMKilled)');
    expect(screen.getByText('needs attention: api, cache')).toBeInTheDocument();
  });

  it('reads another project when its tab is chosen', async () => {
    const calls = mockBackend();
    const user = userEvent.setup();
    render(<ConsoleApp />);
    await user.click(await screen.findByRole('tab', { name: 'docker-bridge 3/3' }));
    expect(await service('auth')).toBeInTheDocument();
    expect(screen.queryByTestId('service-web')).toBeNull();
    const asked = calls.filter((call) => call.key === 'POST /api/tools/call').map((call) => (call.body.arguments as { project: string }).project);
    expect(asked).toEqual(expect.arrayContaining(['shop', 'docker-bridge']));
  });

  it('lists what agents asked for, by client, with totals', async () => {
    mockBackend();
    render(<ConsoleApp />);
    const rows = within(await screen.findByTestId('activity-table')).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('cursor 1.9.2');
    expect(rows[0]).toHaveTextContent('tail_filtered_logs');
    expect(rows[0]).toHaveTextContent('18,400 → 320');
    expect(within(rows[1] as HTMLElement).getByText('refused')).toBeInTheDocument();
    expect(screen.getByTestId('activity-totals')).toHaveTextContent('2 calls1 refused0 failed≈ 18,080 tokens saved');
  });

  it('points to the setup guide while no agent has called yet', async () => {
    mockBackend({ activity: NO_ACTIVITY });
    render(<ConsoleApp />);
    expect(await screen.findByText('no tool call on record yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'setup guide' })).toHaveAttribute('href', '/docs/#quick-start');
    expect(screen.getByTestId('overview')).toHaveTextContent('no log has been tailed yet');
  });
});

describe('ConsoleApp when something is wrong', () => {
  it('says so when the engine does not answer', async () => {
    mockBackend({ engine: { reachable: false, error: 'cannot reach the Docker Engine at /var/run/docker.sock (ENOENT): is Docker running?', bridge: BRIDGE } });
    render(<ConsoleApp />);
    expect(await screen.findByRole('alert')).toHaveTextContent('the Docker Engine is not answeringcannot reach the Docker Engine');
    expect(screen.getByText('Docker Engine: unreachable')).toBeInTheDocument();
    expect(screen.queryByRole('tablist', { name: 'Compose projects' })).toBeNull();
  });

  it('says so when the console service itself is down', async () => {
    mockBackend({ engine: { status: 502, body: {} } });
    render(<ConsoleApp />);
    expect(await screen.findByRole('alert')).toHaveTextContent('the console service is not answering');
    expect(screen.getByRole('alert')).toHaveTextContent('docker compose up -d console');
  });

  it('explains an engine with no compose project on it', async () => {
    mockBackend({ engine: { ...ENGINE, projects: [], bridge: { ...BRIDGE, scope: ['shop'] } } });
    render(<ConsoleApp />);
    expect(await screen.findByText('no compose project is visible')).toBeInTheDocument();
    expect(screen.getByText(/within its scope \(shop\)/)).toBeInTheDocument();
  });

  it('shows the tool\'s own message when a project cannot be read', async () => {
    mockBackend({ tool: (name) => (name === 'docker_get_stack_topology' ? toolReply({ error: 'no containers found for compose project "shop"' }, true) : undefined) });
    render(<ConsoleApp />);
    expect(await screen.findByText('could not read this project')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('no containers found for compose project "shop"');
  });

  it('goes to sign-in when the session has ended', async () => {
    mockBackend({ engine: { status: 401, body: { error: 'unauthenticated' } } });
    render(<ConsoleApp />);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/login/?next=/'));
  });
});
