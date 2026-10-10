import type { CodeLanguage } from '@/shared/ui/code-text';

export const SERVER_NAME = 'docker-debug-bridge';
/** The repository's page: public, so it is where a visitor without a session is sent to read more. */
export const REPO_HOME = 'https://github.com/kizzbonez/docker_bridge';
export const REPO_URL = `${REPO_HOME}.git`;
/** Stands in for wherever the repository was cloned. */
export const REPO_PATH = '/path/to/docker_bridge';
/** Placeholder: the name the server would have if you published it to npm. */
export const PACKAGE_NAME = '@your-handle/docker-debug-mcp';

/** Step one, for every client: the server is not on npm, it runs from a clone. */
export const CLONE_COMMAND = `git clone ${REPO_URL}`;

const ENTRY = `${REPO_PATH}/bridge/index.ts`;

function config(command: string, args: string[], env: Record<string, string>): string {
  const envLines = Object.entries(env).map(([name, value]) => `        "${name}": "${value}"`);
  return `{
  "mcpServers": {
    "${SERVER_NAME}": {
      "command": "${command}",
      "args": [${args.map((arg) => `"${arg}"`).join(', ')}],
      "env": {
${envLines.join(',\n')}
      }
    }
  }
}`;
}

/**
 * The `mcpServers` block most MCP clients read. It runs the server from the
 * clone. Read-only is the default; it is spelled out here.
 */
export const MCP_CONFIG_JSON = config('node', [ENTRY], { READ_ONLY_MODE: 'true' });

/** VS Code names the block `servers` and wants the transport stated. */
export const VSCODE_CONFIG_JSON = `{
  "servers": {
    "${SERVER_NAME}": {
      "type": "stdio",
      "command": "node",
      "args": ["${ENTRY}"],
      "env": {
        "READ_ONLY_MODE": "true"
      }
    }
  }
}`;

export const CODEX_CONFIG_TOML = `[mcp_servers.${SERVER_NAME}]
command = "node"
args = ["${ENTRY}"]

[mcp_servers.${SERVER_NAME}.env]
READ_ONLY_MODE = "true"`;

export const CLI_COMMAND = `claude mcp add ${SERVER_NAME} --scope user \\
  -e READ_ONLY_MODE=true \\
  -- node ${ENTRY}`;

/** The same server once published to npm. */
export const PUBLISHED_CONFIG_JSON = config('npx', ['-y', PACKAGE_NAME], {
  DOCKER_SOCKET_PATH: '/var/run/docker.sock',
  READ_ONLY_MODE: 'false',
});

export type SnippetId = 'standard' | 'claude-code' | 'vscode' | 'codex' | 'published';

export interface Snippet {
  id: SnippetId;
  label: string;
  language: CodeLanguage;
  text: string;
  note: string;
}

export const SNIPPETS: Snippet[] = [
  {
    id: 'standard',
    label: 'Any MCP client',
    language: 'json',
    text: MCP_CONFIG_JSON,
    note: 'The block most clients read: Claude Desktop, Cursor, Windsurf, Gemini CLI and Claude Code among them. Replace the path with where you cloned the repository.',
  },
  {
    id: 'claude-code',
    label: 'Claude Code',
    language: 'text',
    text: CLI_COMMAND,
    note: 'Registers the server from a terminal, with no JSON to edit. In PowerShell, put the command on one line.',
  },
  {
    id: 'vscode',
    label: 'VS Code',
    language: 'json',
    text: VSCODE_CONFIG_JSON,
    note: 'Save as .vscode/mcp.json in a workspace, or run "MCP: Open User Configuration" to add it for every workspace.',
  },
  {
    id: 'codex',
    label: 'Codex CLI',
    language: 'text',
    text: CODEX_CONFIG_TOML,
    note: 'Append to ~/.codex/config.toml.',
  },
  {
    id: 'published',
    label: 'npx',
    language: 'json',
    text: PUBLISHED_CONFIG_JSON,
    note: 'What a teammate would use once you publish the server to npm; no clone needed then. The package name is a placeholder for your own scope.',
  },
];

/** Where the clients that read the `mcpServers` block keep it. */
export const CLIENT_FILES: string[][] = [
  ['Claude Code', '~/.claude.json, or .mcp.json at a project root', 'Or use the claude mcp add command below.'],
  ['Claude Desktop', 'claude_desktop_config.json', 'Settings → Developer → Edit Config opens the right file.'],
  ['Cursor', '~/.cursor/mcp.json, or .cursor/mcp.json in a project', ''],
  ['Windsurf', '~/.codeium/windsurf/mcp_config.json', ''],
  ['Gemini CLI', '~/.gemini/settings.json', ''],
  ['VS Code', '.vscode/mcp.json', 'Its own format: see the VS Code block below.'],
  ['Codex CLI', '~/.codex/config.toml', 'TOML: see the Codex block below.'],
];
