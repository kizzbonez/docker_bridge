import { useCallback, useState } from 'react';
import type { ToolName } from '@bridge/core/tool-specs';
import { navigate } from '@/features/auth/model/navigation';
import { ConsoleApiError, consoleApi, type ToolReply } from '../model/console-api';
import { describeProblem } from '../model/describe';

export interface ToolCall<T> {
  run: (args: object) => Promise<void>;
  pending: boolean;
  /** The latest answer, including a refusal or a tool failure. */
  reply: ToolReply<T> | null;
  /** Why the request itself failed (bad arguments, service down), or null. */
  problem: string | null;
}

/** One tool, called on demand: the pending, answer and problem state a form needs. */
export function useToolCall<T>(tool: ToolName): ToolCall<T> {
  const [pending, setPending] = useState(false);
  const [reply, setReply] = useState<ToolReply<T> | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const run = useCallback(
    async (args: object): Promise<void> => {
      setPending(true);
      setProblem(null);
      try {
        setReply(await consoleApi.call<T>(tool, args));
      } catch (error) {
        if (error instanceof ConsoleApiError && error.status === 401) return navigate(`/login/?next=${window.location.pathname}`);
        setReply(null);
        setProblem(describeProblem(error));
      } finally {
        setPending(false);
      }
    },
    [tool],
  );

  return { run, pending, reply, problem };
}
