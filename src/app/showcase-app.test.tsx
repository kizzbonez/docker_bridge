import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { pickActive } from '@/features/docs/hooks/use-scroll-spy';
import { TOC, TOC_IDS } from '@/features/docs/model/toc';
import { describeConstraints } from '@/features/docs/ui/param-table';
import { MCP_CONFIG_JSON } from '@/features/setup/model/config-snippets';
import { TOOL_NAMES } from '@bridge/core/tool-specs';
import { useCountUp } from '@/shared/hooks/use-count-up';
import { navigate } from '@/features/auth/model/navigation';
import { mockFetch } from '@/test/mock-fetch';
import { setReducedMotion } from '@/test/setup';
import { ShowcaseApp } from './showcase-app';
import { DocsApp } from './docs-app';

vi.mock('@/features/auth/model/navigation', async (original) => ({
  ...(await original<typeof import('@/features/auth/model/navigation')>()),
  navigate: vi.fn(),
}));

const status = (authenticated: boolean, setupRequired = false) =>
  mockFetch({ 'GET /auth/status': { body: { setupRequired, authenticated, user: authenticated ? 'operator' : null } } });

describe('ShowcaseApp, for whoever is looking', () => {
  const primary = () => within(screen.getByRole('navigation', { name: 'Primary' }));
  const footer = () => within(screen.getByRole('navigation', { name: 'Footer' }));

  it('gives a visitor no link that would only bounce them to sign-in', async () => {
    status(false);
    render(<ShowcaseApp />);
    expect(await primary().findByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login/');
    expect(primary().queryByRole('link', { name: 'Docs' })).toBeNull();
    expect(primary().queryByRole('link', { name: 'Console' })).toBeNull();
    expect(screen.queryByTestId('session-menu')).toBeNull();

    const guide = screen.getByRole('link', { name: /Read the full setup guide on GitHub/ });
    expect(guide).toHaveAttribute('href', 'https://github.com/kizzbonez/docker_bridge#connect-an-mcp-client');
    expect(guide).toHaveAttribute('target', '_blank');
    expect(guide).toHaveAttribute('rel', 'noopener noreferrer');
    expect(footer().getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      'https://github.com/kizzbonez/docker_bridge#readme',
      'https://github.com/kizzbonez/docker_bridge',
      '/login/',
    ]);
  });

  it('gives someone signed in the way back to the console and the docs', async () => {
    status(true);
    render(<ShowcaseApp />);
    expect(await primary().findByRole('link', { name: 'Console' })).toHaveAttribute('href', '/');
    expect(primary().getByRole('link', { name: 'Docs' })).toHaveAttribute('href', '/docs/');
    expect(primary().queryByRole('link', { name: 'Sign in' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Read the full setup guide →' })).toHaveAttribute('href', '/docs/#quick-start');
    expect(footer().getByRole('link', { name: 'Account & security' })).toBeInTheDocument();
  });

  it('shows the simulation to both, and says it is one', async () => {
    status(false);
    render(<ShowcaseApp />);
    await primary().findByRole('link', { name: 'Sign in' });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Autonomous Container Diagnostics for Agentic Workflows');
    expect(within(screen.getByRole('region', { name: 'System status' })).getByText('simulated data')).toBeInTheDocument();
    expect(primary().getAllByRole('link').map((link) => link.textContent)).toEqual(['Simulator', 'Economy', 'Tools', 'Setup', 'Sign in']);
  });

  it('sends the first person to open a new install to the setup wizard, not to a demo', async () => {
    status(false, true);
    render(<ShowcaseApp />);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/setup/'));
  });
});

describe('ShowcaseApp', () => {
  it('renders the status bar, hero and every section', () => {
    render(<ShowcaseApp />);
    const system = within(screen.getByRole('region', { name: 'System status' }));
    expect(system.getByText(/MCP Server: ACTIVE/)).toHaveTextContent('(stdio: /var/run/docker.sock)');
    expect(system.getByText('Protocol: MCP v1.0')).toBeInTheDocument();
    expect(system.getByTestId('latency')).toHaveTextContent(/^\d+ms$/);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Autonomous Container Diagnostics for Agentic Workflows');
    expect(screen.getByText(/Token-efficient, safety-guarded Docker Engine debugging/)).toBeInTheDocument();
    for (const id of ['simulator', 'economy', 'tools', 'architecture', 'setup']) {
      expect(document.getElementById(id)).not.toBeNull();
    }
    expect(within(screen.getByTestId('hero-stats')).getByText('18,080')).toBeInTheDocument();
  });

  it('starts the 502 diagnostic from "Try Live Simulation"', async () => {
    const user = userEvent.setup();
    render(<ShowcaseApp />);
    const cta = screen.getByRole('link', { name: /Try Live Simulation/ });
    expect(cta).toHaveAttribute('href', '#simulator');
    await user.click(cta);
    expect(screen.getByTestId('container-web-gateway')).toHaveAttribute('data-health', 'degraded');
  });

  it('copies the MCP config from the hero and links to the architecture', async () => {
    const user = userEvent.setup();
    render(<ShowcaseApp />);
    await user.click(screen.getByRole('button', { name: 'Copy MCP Config' }));
    expect(await navigator.clipboard.readText()).toBe(MCP_CONFIG_JSON);
    expect(await screen.findByRole('button', { name: 'Config copied' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View Architecture' })).toHaveAttribute('href', '#architecture');
  });
});

describe('DocsApp', () => {
  it('renders one section per table-of-contents entry, in order', () => {
    render(<DocsApp />);
    const rendered = [...document.querySelectorAll('main section[id]')].map((section) => section.id);
    expect(rendered).toEqual(TOC_IDS);
    const nav = within(screen.getByRole('navigation', { name: 'Documentation sections' }));
    for (const entry of TOC) expect(nav.getByRole('link', { name: entry.title })).toHaveAttribute('href', `#${entry.id}`);
  });

  it('documents every tool with parameters and sample payloads', () => {
    render(<DocsApp />);
    for (const name of TOOL_NAMES) {
      const reference = within(screen.getByTestId(`tool-ref-${name}`));
      expect(reference.getByRole('table')).toBeInTheDocument();
      expect(reference.getByLabelText('request · tools/call')).toHaveTextContent(name);
    }
    expect(within(screen.getByTestId('allowed-binaries')).getByText('pg_isready')).toBeInTheDocument();
  });
});

describe('docs helpers', () => {
  it('describes schema constraints in words', () => {
    expect(describeConstraints({ type: 'integer', description: '', minimum: 10, maximum: 200, default: 120 })).toBe('10–200 · default 120');
    expect(describeConstraints({ type: 'string', description: '', enum: ['a', 'b'] })).toBe('one of a, b');
    expect(describeConstraints({ type: 'string', description: '' })).toBe('—');
  });

  it('picks the later of two sections sharing the reading band', () => {
    expect(pickActive(['a', 'b', 'c'], new Set(['a', 'b']))).toBe('b');
    expect(pickActive(['a', 'b', 'c'], new Set())).toBeUndefined();
  });
});

describe('useCountUp', () => {
  function Counter({ target }: { target: number }) {
    return <output>{Math.round(useCountUp(target, true, 1000))}</output>;
  }

  it('eases from zero to the target when motion is allowed', () => {
    setReducedMotion(false);
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    render(<Counter target={100} />);
    expect(screen.getByRole('status')).toHaveTextContent('0');
    act(() => void vi.advanceTimersByTime(400));
    const midway = Number(screen.getByRole('status').textContent);
    expect(midway).toBeGreaterThan(0);
    expect(midway).toBeLessThan(100);
    act(() => void vi.advanceTimersByTime(1000));
    expect(screen.getByRole('status')).toHaveTextContent('100');
  });

  it('jumps straight to the target under reduced motion', () => {
    render(<Counter target={42} />);
    expect(screen.getByRole('status')).toHaveTextContent('42');
  });
});
