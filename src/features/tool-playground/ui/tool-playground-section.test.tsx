import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ToolPlaygroundSection } from './tool-playground-section';

const status = () => within(screen.getByTestId('tool-status'));
const payload = (label: string) => screen.getByLabelText(label);

describe('ToolPlaygroundSection', () => {
  it('opens on the topology tool with a live response', async () => {
    const user = userEvent.setup();
    render(<ToolPlaygroundSection />);
    expect(screen.getByRole('tab', { name: 'docker_get_stack_topology' })).toHaveAttribute('aria-selected', 'true');
    expect(payload('docker_get_stack_topology response')).toHaveTextContent('"name": "web-gateway"');
    expect(payload('docker_get_stack_topology response')).toHaveTextContent('"cpu_percent"');

    await user.click(screen.getByRole('switch', { name: 'include_metrics' }));
    expect(payload('docker_get_stack_topology response')).not.toHaveTextContent('"cpu_percent"');
  });

  it('shows the request envelope and the schema', async () => {
    const user = userEvent.setup();
    render(<ToolPlaygroundSection />);
    await user.click(screen.getByRole('tab', { name: 'Request' }));
    expect(payload('docker_get_stack_topology request')).toHaveTextContent('"method": "tools/call"');
    await user.click(screen.getByRole('tab', { name: 'Schema JSON' }));
    expect(payload('docker_get_stack_topology schema')).toHaveTextContent('"additionalProperties": false');
  });

  it('moves between tools with the arrow keys', async () => {
    const user = userEvent.setup();
    render(<ToolPlaygroundSection />);
    screen.getByRole('tab', { name: 'docker_get_stack_topology' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'docker_tail_filtered_logs' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'docker_tail_filtered_logs' })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'docker_safe_exec' })).toHaveAttribute('aria-selected', 'true');
  });

  it('filters logs live and rejects a bad or dangerous pattern', async () => {
    const user = userEvent.setup();
    render(<ToolPlaygroundSection />);
    await user.click(screen.getByRole('tab', { name: 'docker_tail_filtered_logs' }));
    expect(payload('docker_tail_filtered_logs response')).toHaveTextContent('"ansi_stripped": true');

    const pattern = screen.getByLabelText(/filter_pattern/);
    fireEvent.change(pattern, { target: { value: '(' } });
    expect(status().getByText('invalid params')).toBeInTheDocument();
    expect(payload('docker_tail_filtered_logs response')).toHaveTextContent('-32602');

    fireEvent.change(pattern, { target: { value: '(a+)+$' } });
    expect(payload('docker_tail_filtered_logs response')).toHaveTextContent('ReDoS guard');

    fireEvent.change(pattern, { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(/token_budget/), { target: { value: '64' } });
    expect(status().getByText('truncated at budget')).toBeInTheDocument();
  });

  it('blocks destructive commands and gates state changes behind READ_ONLY_MODE', async () => {
    const user = userEvent.setup();
    render(<ToolPlaygroundSection />);
    await user.click(screen.getByRole('tab', { name: 'docker_safe_exec' }));
    expect(status().getByText('ok')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /drop table/ }));
    expect(status().getByText('blocked')).toBeInTheDocument();
    expect(payload('docker_safe_exec response')).toHaveTextContent('mutating SQL is blocked');

    await user.selectOptions(screen.getByLabelText('container'), 'web-gateway');
    await user.click(screen.getByRole('button', { name: 'nginx -s reload' }));
    expect(status().getByText('blocked')).toBeInTheDocument();
    await user.click(screen.getByRole('switch', { name: /READ_ONLY_MODE/ }));
    expect(status().getByText('ok')).toBeInTheDocument();
  });

  it('kills a command that outlives its timeout', async () => {
    const user = userEvent.setup();
    render(<ToolPlaygroundSection />);
    await user.click(screen.getByRole('tab', { name: 'docker_safe_exec' }));
    await user.selectOptions(screen.getByLabelText('container'), 'order-api');
    await user.click(screen.getByRole('button', { name: 'sleep 30' }));
    expect(status().getByText('timed out')).toBeInTheDocument();
    expect(payload('docker_safe_exec response')).toHaveTextContent('SIGKILL after 2000 ms');
  });
});
