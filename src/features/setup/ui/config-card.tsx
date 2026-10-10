import { useState } from 'react';
import { CodeBlock } from '@/shared/ui/code-block';
import { CopyButton } from '@/shared/ui/copy-button';
import { GlassPanel } from '@/shared/ui/glass-panel';
import { TabPanel, Tabs } from '@/shared/ui/tabs';
import { SNIPPETS, type SnippetId } from '../model/config-snippets';

const TABS = SNIPPETS.map((snippet) => ({ id: snippet.id, label: snippet.label }));

/** The copy-paste configuration, one tab per kind of MCP client. */
export function ConfigCard() {
  const [active, setActive] = useState<SnippetId>('standard');
  const snippet = SNIPPETS.find((entry) => entry.id === active) ?? SNIPPETS[0];
  if (!snippet) return null;

  return (
    <GlassPanel data-testid="config-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/15 px-4 py-3">
        <Tabs label="Configuration target" idPrefix="setup" tabs={TABS} active={active} onChange={setActive} />
        <CopyButton text={snippet.text} label="Copy" copiedLabel="Copied" className="px-3 py-1.5 text-xs" />
      </div>
      <TabPanel idPrefix="setup" active={active}>
        <CodeBlock text={snippet.text} language={snippet.language} label={`${snippet.label} configuration`} />
        <p className="border-t border-cyan-500/15 px-4 py-3 text-sm text-ink-dim">{snippet.note}</p>
      </TabPanel>
    </GlassPanel>
  );
}
