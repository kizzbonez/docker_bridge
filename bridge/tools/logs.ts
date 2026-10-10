import { compilePattern } from '../core/filter-pattern.ts';
import { runLogPipeline, type TailOptions } from '../core/log-pipeline.ts';
import { findContainer, type EngineAccess } from '../docker/containers.ts';
import { messageOf } from '../docker/engine.ts';
import { inspectContainer } from '../docker/inspect.ts';
import { demux, toLines } from '../docker/stream.ts';
import { InvalidParams, ToolError } from '../errors.ts';

export interface LogArgs extends TailOptions {
  container: string;
  project?: string;
}

/** Enough for 2,000 very long lines; anything beyond is cut off before parsing. */
const MAX_LOG_BYTES = 4 * 1024 * 1024;

/** `docker_tail_filtered_logs` against a live engine. */
export async function tailLogs(access: EngineAccess, args: LogArgs): Promise<Record<string, unknown>> {
  // Refuse a bad pattern before touching the engine.
  const pattern = compilePattern(args.filter_pattern);
  if (!pattern.ok) throw new InvalidParams(pattern.message);

  const container = await findContainer(access, args.container, args.project);
  const details = await inspectContainer(access.engine, container.id);
  const response = await access.engine.send('GET', `/containers/${container.id}/logs?stdout=1&stderr=1&tail=${args.tail_lines}`, {
    maxBytes: MAX_LOG_BYTES,
  });
  if (response.timedOut) throw new ToolError('the Docker Engine did not return the log in time');
  if (response.status >= 400) throw new ToolError(`Docker Engine: ${messageOf(response)}`);

  const text = details.tty ? response.body.toString('utf8') : demux(response.body).combined;
  // Line numbers count from the start of the tail: the engine does not say
  // how long the whole log is.
  const outcome = runLogPipeline(toLines(text), args, 1);
  if (!outcome.ok) throw new InvalidParams(outcome.message);
  return { container: container.name, ...outcome.summary };
}
