import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { setReducedMotion } from '@/test/setup';
import { useSimulator } from '../hooks/use-simulator';
import { PAUSE_MS, TICK_MS } from '../model/playback';
import { SimulatorSection } from './simulator-section';

function Harness() {
  return <SimulatorSection simulator={useSimulator()} />;
}

const card = (id: string) => screen.getByTestId(`container-${id}`);
const terminal = () => screen.getByTestId('terminal-output');

describe('SimulatorSection', () => {
  it('starts idle with a healthy mesh', () => {
    render(<Harness />);
    expect(screen.getByText('all healthy')).toBeInTheDocument();
    expect(within(terminal()).getByText(/Pick an incident below/)).toBeInTheDocument();
    for (const id of ['web-gateway', 'order-api', 'cache-redis', 'db-postgres']) {
      expect(card(id)).toHaveAttribute('data-health', 'healthy');
    }
    expect(screen.getByRole('button', { name: /Skip to result/ })).toBeDisabled();
  });

  it('turns cache-redis red with ExitCode 137 (OOMKilled) when the OOM is triggered', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: /Simulate Redis OOM Crash/ }));

    expect(card('cache-redis')).toHaveAttribute('data-health', 'restarting');
    expect(within(card('cache-redis')).getByText(/ExitCode: 137 \(OOMKilled\)/)).toBeInTheDocument();
    expect(card('order-api')).toHaveAttribute('data-health', 'degraded');
    expect(screen.getByText('2 unhealthy')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /order-api to cache-redis: broken/ })).toBeInTheDocument();
  });

  it('shows the tool calls, the diff and the verdict in the transcript', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: /Trigger 502 Outage Diagnostic/ }));

    const transcript = within(terminal());
    expect(transcript.getByText('docker_get_stack_topology')).toBeInTheDocument();
    expect(transcript.getAllByText('docker_tail_filtered_logs')).toHaveLength(2);
    expect(transcript.getByText('nginx/conf.d/upstream.conf')).toBeInTheDocument();
    expect(transcript.getByText(/^\+ server order-api:8081;$/)).toBeInTheDocument();
    expect(transcript.getByText(/Root cause: port drift/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('A fix has been proposed');
  });

  it('heals the mesh when the fix is applied and clears on reset', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: /Simulate Redis OOM Crash/ }));
    await user.click(screen.getByRole('button', { name: /Apply fix/ }));

    expect(card('cache-redis')).toHaveAttribute('data-health', 'healthy');
    expect(within(card('cache-redis')).getByText('148 / 512 MiB')).toBeInTheDocument();
    expect(screen.getByText('all healthy')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Reset/ }));
    expect(within(terminal()).getByText(/Pick an incident below/)).toBeInTheDocument();
  });

  it('inspects whichever container is selected', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'db-postgres' }));
    const inspector = within(screen.getByTestId('container-inspector'));
    expect(inspector.getByText('postgres:17-alpine')).toBeInTheDocument();
    expect(inspector.getByText('primary database')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'db-postgres' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('streams the transcript over time when motion is allowed', () => {
    setReducedMotion(false);
    vi.useFakeTimers();
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /Run DB Connection Test/ }));

    expect(within(terminal()).getByText(/Reading prompt/)).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(PAUSE_MS.prompt + TICK_MS * 4));
    expect(within(terminal()).getByText(/^Run a da/)).toBeInTheDocument();
    expect(within(terminal()).queryByText(/Result: the database is reachable/)).not.toBeInTheDocument();
    expect(card('db-postgres')).toHaveAttribute('data-health', 'degraded');

    act(() => void vi.advanceTimersByTime(60_000));
    expect(within(terminal()).getByText(/Result: the database is reachable/)).toBeInTheDocument();
  });

  it('skips a running diagnostic straight to its result', () => {
    setReducedMotion(false);
    vi.useFakeTimers();
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /Simulate Redis OOM Crash/ }));
    fireEvent.click(screen.getByRole('button', { name: /Skip to result/ }));
    expect(within(terminal()).getByText(/Root cause: cache-redis has no maxmemory/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Apply fix/ })).toBeEnabled();
  });
});
