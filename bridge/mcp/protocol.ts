import { validateArgs } from '../core/validate-args.ts';
import { InvalidParams, ToolError } from '../errors.ts';
import type { Tool } from '../tools/registry.ts';

/** Protocol revisions this server speaks, newest first. */
export const PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];

const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;
const INTERNAL_ERROR = -32603;

type Id = string | number | null;

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: Id;
  result?: unknown;
  error?: { code: number; message: string };
}

export interface ServerInfo {
  name: string;
  version: string;
  instructions: string;
}

export type Dispatch = (message: unknown) => Promise<JsonRpcResponse | null>;

/** Thrown inside a handler to answer with a JSON-RPC error. */
class RpcError extends Error {
  readonly code: number;

  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const failure = (id: Id, code: number, message: string): JsonRpcResponse => ({ jsonrpc: '2.0', id, error: { code, message } });

export const parseError = (): JsonRpcResponse => failure(null, PARSE_ERROR, 'Parse error');

function initialize(params: unknown, info: ServerInfo): unknown {
  const requested = isObject(params) ? params.protocolVersion : undefined;
  // Agree to the client's revision when we speak it; otherwise offer our newest.
  const protocolVersion = PROTOCOL_VERSIONS.find((version) => version === requested) ?? PROTOCOL_VERSIONS[0];
  return {
    protocolVersion,
    capabilities: { tools: { listChanged: false } },
    serverInfo: { name: info.name, version: info.version },
    instructions: info.instructions,
  };
}

function listTools(tools: Tool[]): unknown {
  return {
    tools: tools.map(({ spec }) => ({
      name: spec.name,
      title: spec.title,
      description: spec.description,
      inputSchema: spec.inputSchema,
      annotations: { title: spec.title, ...spec.annotations, openWorldHint: false },
    })),
  };
}

/** A tool result: the structured value, plus the same JSON as text for older clients. */
const toolResult = (structured: Record<string, unknown>, isError: boolean): unknown => ({
  content: [{ type: 'text', text: JSON.stringify(structured, null, 2) }],
  structuredContent: structured,
  isError,
});

async function callTool(params: unknown, tools: Tool[]): Promise<unknown> {
  if (!isObject(params) || typeof params.name !== 'string') throw new RpcError(INVALID_PARAMS, 'tools/call needs a tool name');
  const tool = tools.find((candidate) => candidate.spec.name === params.name);
  if (!tool) throw new RpcError(INVALID_PARAMS, `unknown tool: ${params.name}`);
  const validated = validateArgs(tool.spec.inputSchema, params.arguments);
  if (!validated.ok) throw new RpcError(INVALID_PARAMS, validated.message);

  try {
    const output = await tool.run(validated.args);
    return toolResult(output.structured, output.isError);
  } catch (error) {
    if (error instanceof InvalidParams) throw new RpcError(INVALID_PARAMS, error.message);
    // Expected failures go back as a result, so the model can read why and adapt.
    if (error instanceof ToolError) return toolResult({ error: error.message }, true);
    throw error;
  }
}

async function handle(method: string, params: unknown, info: ServerInfo, tools: Tool[]): Promise<unknown> {
  if (method === 'initialize') return initialize(params, info);
  if (method === 'ping') return {};
  if (method === 'tools/list') return listTools(tools);
  if (method === 'tools/call') return callTool(params, tools);
  throw new RpcError(METHOD_NOT_FOUND, `Method not found: ${method}`);
}

/**
 * The MCP server as a function from one JSON-RPC message to one response.
 * Notifications (messages without an id) never get a reply.
 */
export function createDispatcher(info: ServerInfo, tools: Tool[], log: (line: string) => void = () => undefined): Dispatch {
  return async (message) => {
    if (!isObject(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
      return failure(null, INVALID_REQUEST, 'Invalid Request');
    }
    const isNotification = !('id' in message);
    const id = (message.id ?? null) as Id;
    try {
      const result = await handle(message.method, message.params, info, tools);
      return isNotification ? null : { jsonrpc: '2.0', id, result };
    } catch (error) {
      if (isNotification) return null;
      if (error instanceof RpcError) return failure(id, error.code, error.message);
      log(`internal error in ${message.method}: ${error instanceof Error ? error.message : String(error)}`);
      return failure(id, INTERNAL_ERROR, 'Internal error');
    }
  };
}
