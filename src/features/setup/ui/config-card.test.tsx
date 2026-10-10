import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { writeClipboard } from '@/shared/lib/clipboard';
import { CLI_COMMAND, MCP_CONFIG_JSON, SNIPPETS } from '../model/config-snippets';
import { ConfigCard } from './config-card';

describe('config snippets', () => {
  it('is valid JSON matching the documented server entry', () => {
    expect(JSON.parse(MCP_CONFIG_JSON)).toEqual({
      mcpServers: {
        'docker-debug-bridge': {
          command: 'npx',
          args: ['-y', '@your-handle/docker-debug-mcp'],
          env: { DOCKER_SOCKET_PATH: '/var/run/docker.sock', READ_ONLY_MODE: 'false' },
        },
      },
    });
  });

  it('registers the same server from the CLI', () => {
    expect(CLI_COMMAND).toContain('claude mcp add docker-debug-bridge');
    expect(CLI_COMMAND).toContain('-e READ_ONLY_MODE=false');
    expect(CLI_COMMAND).toMatch(/-- npx -y @your-handle\/docker-debug-mcp$/);
    expect(SNIPPETS.map((snippet) => snippet.label)).toEqual(['~/.claude.json', '.mcp.json', 'claude mcp add']);
  });
});

describe('ConfigCard', () => {
  it('copies the visible snippet and confirms it', async () => {
    const user = userEvent.setup();
    render(<ConfigCard />);
    await user.click(screen.getByRole('button', { name: 'Copy' }));
    expect(await navigator.clipboard.readText()).toBe(MCP_CONFIG_JSON);
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });

  it('switches to the CLI command', async () => {
    const user = userEvent.setup();
    render(<ConfigCard />);
    await user.click(screen.getByRole('tab', { name: 'claude mcp add' }));
    expect(screen.getByLabelText('claude mcp add configuration')).toHaveTextContent('claude mcp add docker-debug-bridge');
    await user.click(screen.getByRole('button', { name: 'Copy' }));
    expect(await navigator.clipboard.readText()).toBe(CLI_COMMAND);
  });
});

describe('writeClipboard', () => {
  it('falls back to a selection copy when the async clipboard is unavailable', async () => {
    const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    const execCommand = vi.fn(() => true);
    document.execCommand = execCommand;

    expect(await writeClipboard('hello')).toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(document.querySelector('textarea')).toBeNull();

    if (original) Object.defineProperty(navigator, 'clipboard', original);
    else Reflect.deleteProperty(navigator, 'clipboard');
  });

  it('reports failure when neither path works', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('denied')) },
    });
    document.execCommand = vi.fn(() => {
      throw new Error('unsupported');
    });
    expect(await writeClipboard('hello')).toBe(false);
    Reflect.deleteProperty(navigator, 'clipboard');
  });
});
