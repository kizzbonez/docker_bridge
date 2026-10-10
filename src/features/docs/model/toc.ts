export const TOC_GROUPS = ['Start', 'Reference', 'Operate'] as const;
export type TocGroup = (typeof TOC_GROUPS)[number];

export interface TocEntry {
  id: string;
  title: string;
  group: TocGroup;
}

/** Single source of truth for section order, anchors and sidebar grouping. */
export const TOC: TocEntry[] = [
  { id: 'overview', title: 'Overview', group: 'Start' },
  { id: 'quick-start', title: 'Quick start', group: 'Start' },
  { id: 'configuration', title: 'Configuration', group: 'Start' },
  { id: 'tools-reference', title: 'Tools reference', group: 'Reference' },
  { id: 'guardrails', title: 'Guardrails', group: 'Reference' },
  { id: 'log-pipeline', title: 'Log pipeline', group: 'Reference' },
  { id: 'tour', title: 'Dashboard tour', group: 'Operate' },
  { id: 'run-dashboard', title: 'Run the dashboard', group: 'Operate' },
  { id: 'access', title: 'Sign-in & onboarding', group: 'Operate' },
  { id: 'security', title: 'Security posture', group: 'Operate' },
  { id: 'project-layout', title: 'Project layout', group: 'Operate' },
  { id: 'troubleshooting', title: 'Troubleshooting', group: 'Operate' },
];

export const TOC_IDS: string[] = TOC.map((entry) => entry.id);

export function titleOf(id: string): string {
  return TOC.find((entry) => entry.id === id)?.title ?? id;
}
