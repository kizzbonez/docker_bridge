export interface StackOptions {
  project: string;
  port: number;
  /** The folder whose activity log the stack's console should show. */
  activityDir: string;
}

export function startStack(options: StackOptions): { baseUrl: string; setupToken: string };
export function stopStack(project: string): void;
