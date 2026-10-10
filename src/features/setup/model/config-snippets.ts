import type { CodeLanguage } from '@/shared/ui/code-text';

export const SERVER_NAME = 'docker-debug-bridge';
/** Stands in for wherever this repository was cloned. */
export const REPO_PATH = '/path/to/docker_bridge';
/** Placeholder: the name the server would have if you published it to npm. */
export const PACKAGE_NAME = '@your-handle/docker-debug-mcp';

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

/** Runs the server from a clone of this repository. Read-only is the default; it is spelled out here. */
export const MCP_CONFIG_JSON = config('node', [`${REPO_PATH}/bridge/index.ts`], { READ_ONLY_MODE: 'true' });

/** The same server once published to npm. */
export const PUBLISHED_CONFIG_JSON = config('npx', ['-y', PACKAGE_NAME], {
  DOCKER_SOCKET_PATH: '/var/run/docker.sock',
  READ_ONLY_MODE: 'false',
});

export const CLI_COMMAND = `claude mcp add ${SERVER_NAME} --scope user \\
  -e READ_ONLY_MODE=true \\
  -- node ${REPO_PATH}/bridge/index.ts`;

export type SnippetId = 'user' | 'project' | 'cli' | 'published';

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
    note: 'User scope: available in every project on this machine. Replace the path with where you cloned the repository.',
  },
  {
    id: 'project',
    label: '.mcp.json',
    language: 'json',
    text: MCP_CONFIG_JSON,
    note: 'Project scope: commit this file at the root of a project to offer the server to everyone who works in it.',
  },
  {
    id: 'cli',
    label: 'claude mcp add',
    language: 'text',
    text: CLI_COMMAND,
    note: 'Registers the same server from a terminal, with no JSON to edit.',
  },
  {
    id: 'published',
    label: 'npx',
    language: 'json',
    text: PUBLISHED_CONFIG_JSON,
    note: 'What a teammate would use once you publish the server to npm. The package name is a placeholder for your own scope.',
  },
];
