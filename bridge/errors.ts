/** The caller's arguments are wrong. Reported as JSON-RPC error -32602. */
export class InvalidParams extends Error {}

/**
 * An expected failure while running a tool: no such container, the engine is
 * unreachable. Reported to the model as a tool result with `isError: true`,
 * so it can read the reason and try something else.
 */
export class ToolError extends Error {}
