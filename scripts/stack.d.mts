export interface StackOptions {
  project: string;
  port: number;
  /** The folder whose activity log the stack's console should show. */
  activityDir: string;
  /** Serve the simulated showcase without a session. Off by default. */
  publicShowcase?: boolean;
}

export function startStack(options: StackOptions): { baseUrl: string; setupToken: string };
export function stopStack(project: string): void;
