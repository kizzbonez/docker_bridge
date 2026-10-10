import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ConsoleApp } from '@/app/console-app';
import { BRIDGE, ENGINE, REFUSED, mockBackend, toolReply } from './test-fixtures';

const lastCall = (calls: Array<{ key: string; body: Record<string, unknown> }>, tool: string) =>
  calls.filter((call) => call.key === 'POST /api/tools/call' && call.body.name === tool).at(-1)?.body.arguments;

async function open() {
  const user = userEvent.setup();
  render(<ConsoleApp />);
  await screen.findByRole('combobox', { name: /container/ });
  return user;
}

describe('inspecting a container', () => {
  it('reads nothing until asked, then tails the chosen container through the filter', async () => {
    const calls = mockBackend();
    const user = await open();
    expect(screen.getByText(/Nothing is read until you ask/)).toBeInTheDocument();
    expect(lastCall(calls, 'docker_tail_filtered_logs')).toBeUndefined();

    await user.type(screen.getByLabelText(/filter_pattern/), 'error|502');
    await user.click(screen.getByRole('button', { name: 'Tail web' }));

    const result = within(await screen.findByTestId('tool-result'));
    expect(lastCall(calls, 'docker_tail_filtered_logs')).toEqual({ container: 'web', project: 'shop', filter_pattern: 'error|502', tail_lines: 200, token_budget: 320, strip_ansi: true });
    expect(result.getByText('200 scanned · 41 matched · 2 returned')).toBeInTheDocument();
    expect(result.getByText('≈ 18,400 → 320 tokens · 98% saved')).toBeInTheDocument();
    expect(result.getByText('cut at the token budget')).toBeInTheDocument();
    const lines = within(result.getByRole('group', { name: 'Filtered log of shop-web-1' })).getAllByRole('listitem');
    expect(lines[0]).toHaveTextContent('12×38[error] connect() failed');
    expect(lines[1]).toHaveTextContent('190GET /orders 502');
  });

  it('follows the card that was chosen in the stack', async () => {
    const calls = mockBackend();
    const user = await open();
    await user.click(screen.getByRole('link', { name: 'cache' }));
    expect(screen.getByRole('combobox', { name: /container/ })).toHaveValue('cache');
    expect(screen.getByRole('link', { name: 'cache' })).toHaveAttribute('aria-current', 'true');
    await user.click(screen.getByRole('button', { name: 'Tail cache' }));
    await screen.findByTestId('tool-result');
    expect(lastCall(calls, 'docker_tail_filtered_logs')).toMatchObject({ container: 'cache', project: 'shop' });
  });

  it('shows why a filter was not accepted', async () => {
    mockBackend({ tool: (name) => (name === 'docker_tail_filtered_logs' ? { status: 400, body: { error: 'invalid_params', message: 'filter_pattern has nested quantifiers' } } : undefined) });
    const user = await open();
    await user.click(screen.getByRole('button', { name: 'Tail web' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('the request was not acceptedfilter_pattern has nested quantifiers');
  });

  it('shows a tool failure, such as a container that is gone', async () => {
    mockBackend({ tool: (name) => (name === 'docker_tail_filtered_logs' ? toolReply({ error: 'no container named "web"' }, true) : undefined) });
    const user = await open();
    await user.click(screen.getByRole('button', { name: 'Tail web' }));
    expect(await screen.findByText('the log could not be read')).toBeInTheDocument();
    expect(screen.getByText('no container named "web"')).toBeInTheDocument();
  });
});

describe('running a command', () => {
  async function openExec() {
    const user = await open();
    await user.click(screen.getByRole('tab', { name: 'docker_safe_exec' }));
    return user;
  }

  it('runs an allowlisted command and prints what it wrote', async () => {
    const calls = mockBackend();
    const user = await openExec();
    await user.click(screen.getByRole('button', { name: 'Run in web' }));
    const result = within(await screen.findByTestId('tool-result'));
    expect(lastCall(calls, 'docker_safe_exec')).toEqual({ container: 'web', project: 'shop', command: 'ps', timeout_ms: 2000 });
    expect(result.getByText('allowed')).toBeInTheDocument();
    expect(result.getByText('exit 0 · 132 ms')).toBeInTheDocument();
    expect(result.getByRole('group', { name: 'stdout' })).toHaveTextContent('PID USER 1 nginx');
    expect(result.queryByRole('group', { name: 'stderr' })).toBeNull();
  });

  it('shows the policy\'s refusal, with the rule that applied', async () => {
    const calls = mockBackend({ tool: (name) => (name === 'docker_safe_exec' ? toolReply(REFUSED, true) : undefined) });
    const user = await openExec();
    await user.click(screen.getByRole('button', { name: 'rm -rf /tmp' }));
    expect(screen.getByRole('textbox', { name: /^command/ })).toHaveValue('rm -rf /tmp');
    await user.click(screen.getByRole('button', { name: 'Run in web' }));
    const result = within(await screen.findByTestId('tool-result'));
    expect(lastCall(calls, 'docker_safe_exec')).toMatchObject({ command: 'rm -rf /tmp' });
    expect(result.getByText('blocked')).toBeInTheDocument();
    expect(result.getByTestId('guardrail')).toHaveTextContent('rm is not on the allowlist of diagnostic binaries');
  });

  it('will not submit an empty command', async () => {
    mockBackend();
    const user = await openExec();
    await user.clear(screen.getByRole('textbox', { name: /^command/ }));
    expect(screen.getByRole('button', { name: 'Run in web' })).toBeDisabled();
  });

  it('warns that it refuses to run anything in its own stack', async () => {
    mockBackend();
    const user = await openExec();
    expect(screen.getByText(/Read-only mode is on/)).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'docker-bridge 3/3' }));
    expect(await screen.findByText("this is the console's own stack")).toBeInTheDocument();
  });

  it('offers no form when exec is switched off for the browser', async () => {
    mockBackend({ engine: { ...ENGINE, bridge: { ...BRIDGE, execEnabled: false } } });
    await openExec();
    expect(screen.getByText('running commands from the browser is switched off')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /^command/ })).toBeNull();
  });
});
