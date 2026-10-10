import { MAX_COMMAND_LENGTH } from './exec-policy';
import { MAX_PATTERN_LENGTH } from './filter-pattern';
import { CONTAINER_IDS } from './types';

export const TOOL_NAMES = ['docker_get_stack_topology', 'docker_tail_filtered_logs', 'docker_safe_exec'] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

/** The subset of JSON Schema these tools use. */
export interface SchemaProperty {
  type: 'string' | 'integer' | 'boolean';
  description: string;
  default?: string | number | boolean;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  maxLength?: number;
}

export interface InputSchema {
  type: 'object';
  properties: Record<string, SchemaProperty>;
  required: string[];
  additionalProperties: false;
}

export interface ToolSpec {
  name: ToolName;
  description: string;
  inputSchema: InputSchema;
  annotations: { readOnlyHint: boolean; destructiveHint: boolean; idempotentHint: boolean };
}

const container: SchemaProperty = {
  type: 'string',
  enum: [...CONTAINER_IDS],
  description: 'Service name within the compose project.',
};

const topology: ToolSpec = {
  name: 'docker_get_stack_topology',
  description:
    'One compact graph of a compose project: services, health, restart counts, resource usage and dependency edges.',
  inputSchema: {
    type: 'object',
    properties: {
      project: { type: 'string', description: 'Compose project name.' },
      include_metrics: { type: 'boolean', default: true, description: 'Attach CPU and memory per service.' },
      include_stopped: { type: 'boolean', default: true, description: 'Include exited containers.' },
    },
    required: ['project'],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
};

const tailLogs: ToolSpec = {
  name: 'docker_tail_filtered_logs',
  description:
    'Tails a container log, strips ANSI, keeps only lines matching a regex, collapses repeats and stops at a token budget.',
  inputSchema: {
    type: 'object',
    properties: {
      container,
      filter_pattern: {
        type: 'string',
        maxLength: MAX_PATTERN_LENGTH,
        default: '',
        description: 'Case-insensitive regular expression. Empty matches every line.',
      },
      tail_lines: { type: 'integer', minimum: 10, maximum: 200, default: 120, description: 'Lines read from the end of the log.' },
      strip_ansi: { type: 'boolean', default: true, description: 'Remove ANSI escape sequences before matching.' },
      token_budget: { type: 'integer', minimum: 64, maximum: 1024, default: 320, description: 'Upper bound on returned log text, in estimated tokens.' },
    },
    required: ['container'],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
};

const safeExec: ToolSpec = {
  name: 'docker_safe_exec',
  description:
    'Runs one allowlisted diagnostic command inside a container, as argv with a hard timeout. Never invokes a shell.',
  inputSchema: {
    type: 'object',
    properties: {
      container,
      command: { type: 'string', maxLength: MAX_COMMAND_LENGTH, description: 'Binary and arguments, checked against the policy before it runs.' },
      timeout_ms: { type: 'integer', minimum: 250, maximum: 10000, default: 2000, description: 'Deadline after which the process is killed.' },
    },
    required: ['container', 'command'],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
};

/** Tool definitions as the server would return them from `tools/list`. */
export const TOOL_SPECS: Record<ToolName, ToolSpec> = {
  docker_get_stack_topology: topology,
  docker_tail_filtered_logs: tailLogs,
  docker_safe_exec: safeExec,
};
