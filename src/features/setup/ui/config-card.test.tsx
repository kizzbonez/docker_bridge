import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { writeClipboard } from '@/shared/lib/clipboard';
import { CLIENT_FILES, CLI_COMMAND, CLONE_COMMAND, CODEX_CONFIG_TOML, MCP_CONFIG_JSON, PUBLISHED_CONFIG_JSON, SNIPPETS, VSCODE_CONFIG_JSON } from '../model/config-snippets';
import { ConfigCard } from './config-card';
import { SetupSection } from './setup-section';

describe('config snippets', () => {
  it('runs the server from the repository, read-only', () => {
    expect(JSON.parse(MCP_CONFIG_JSON)).toEqual({
      mcpServers: {
        'docker-debug-bridge': { command: 'node', args: ['/path/to/docker_bridge/bridge/index.ts'], env: { READ_ONLY_MODE: 'true' } },
      },
    });
  });

  it('keeps the published form from the brief as an option', () => {
    expect(JSON.parse(PUBLISHED_CONFIG_JSON)).toEqual({
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
    expect(CLI_COMMAND).toContain('claude mcp add docker-debug-bridge --scope user');
    expect(CLI_COMMAND).toContain('-e READ_ONLY_MODE=true');
    expect(CLI_COMMAND).toMatch(/-- node \/path\/to\/docker_bridge\/bridge\/index\.ts$/);
  });

  it('is not tied to one client: every kind gets its own block, all pointing at the clone', () => {
    expect(SNIPPETS.map((snippet) => snippet.label)).toEqual(['Any MCP client', 'Claude Code', 'VS Code', 'Codex CLI', 'npx']);
    expect(JSON.parse(VSCODE_CONFIG_JSON)).toEqual({
      servers: { 'docker-debug-bridge': { type: 'stdio', command: 'node', args: ['/path/to/docker_bridge/bridge/index.ts'], env: { READ_ONLY_MODE: 'true' } } },
    });
    expect(CODEX_CONFIG_TOML).toContain('[mcp_servers.docker-debug-bridge]');
    expect(CODEX_CONFIG_TOML).toContain('args = ["/path/to/docker_bridge/bridge/index.ts"]');
    expect(CODEX_CONFIG_TOML).toContain('READ_ONLY_MODE = "true"');
    expect(CLIENT_FILES.map(([client]) => client)).toEqual(['Claude Code', 'Claude Desktop', 'Cursor', 'Windsurf', 'Gemini CLI', 'VS Code', 'Codex CLI']);
  });

  it('starts with cloning the repository, because the server runs from it', () => {
    expect(CLONE_COMMAND).toBe('git clone https://github.com/kizzbonez/docker_bridge.git');
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
    await user.click(screen.getByRole('tab', { name: 'Claude Code' }));
    expect(screen.getByLabelText('Claude Code configuration')).toHaveTextContent('claude mcp add docker-debug-bridge');
    await user.click(screen.getByRole('button', { name: 'Copy' }));
    expect(await navigator.clipboard.readText()).toBe(CLI_COMMAND);
  });
});

describe('SetupSection', () => {
  it('makes cloning the repository the first step, for any client', () => {
    render(<SetupSection />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Connect any MCP client');
    const steps = screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent);
    expect(steps).toEqual(['Clone the repository', 'Register it with your client', 'Decide how much it may do', 'Ask a real question']);
    expect(screen.getByText(CLONE_COMMAND)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Any MCP client' })).toHaveAttribute('aria-selected', 'true');
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
