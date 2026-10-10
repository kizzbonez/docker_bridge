/** JSON-RPC 2.0 envelopes as an MCP client and server exchange them over stdio. */

export function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function rpcCall(id: number, tool: string, args: object): string {
  return pretty({ jsonrpc: '2.0', id, method: 'tools/call', params: { name: tool, arguments: args } });
}

export function rpcResult(id: number, structuredContent: unknown, isError = false): string {
  return pretty({ jsonrpc: '2.0', id, result: { isError, structuredContent } });
}

/** Protocol-level failure, e.g. -32602 for arguments that fail validation. */
export function rpcError(id: number, code: number, message: string): string {
  return pretty({ jsonrpc: '2.0', id, error: { code, message } });
}

export const INVALID_PARAMS = -32602;
