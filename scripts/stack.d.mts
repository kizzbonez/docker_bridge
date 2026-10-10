export interface StackOptions {
  project: string;
  port: number;
}

export function startStack(options: StackOptions): { baseUrl: string; setupToken: string };
export function stopStack(project: string): void;
