import type { CodeLanguage } from '@/shared/ui/code-text';

export const SERVER_NAME = 'docker-debug-bridge';
/** Placeholder: replace with the name your MCP server package is published under. */
export const PACKAGE_NAME = '@your-handle/docker-debug-mcp';

/** The `mcpServers` entry, formatted exactly as it should be pasted. */
export const MCP_CONFIG_JSON = `{
  "mcpServers": {
    "${SERVER_NAME}": {
      "command": "npx",
      "args": ["-y", "${PACKAGE_NAME}"],
      "env": {
        "DOCKER_SOCKET_PATH": "/var/run/docker.sock",
        "READ_ONLY_MODE": "false"
      }
    }
  }
}`;

export const CLI_COMMAND = `claude mcp add ${SERVER_NAME} \\
  -e DOCKER_SOCKET_PATH=/var/run/docker.sock \\
  -e READ_ONLY_MODE=false \\
  -- npx -y ${PACKAGE_NAME}`;

export type SnippetId = 'user' | 'project' | 'cli';

export interface Snippet {
  id: SnippetId;
  label: string;
  language: CodeLanguage;
  text: string;
  note: string;
}

export const SNIPPETS: Snippet[] = [
  {
    id: 'user',
    label: '~/.claude.json',
    language: 'json',
    text: MCP_CONFIG_JSON,
    note: 'User scope: the server is available in every project on this machine.',
  },
  {
    id: 'project',
    label: '.mcp.json',
    language: 'json',
    text: MCP_CONFIG_JSON,
    note: 'Project scope: commit this file at the repository root to share the server with your team.',
  },
  {
    id: 'cli',
    label: 'claude mcp add',
    language: 'text',
    text: CLI_COMMAND,
    note: 'Registers the same server from a terminal. Add --scope user or --scope project to choose where it is saved.',
  },
];
