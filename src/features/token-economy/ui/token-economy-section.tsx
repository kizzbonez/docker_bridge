import { memo, useMemo, useState } from 'react';
import { RAW_LOGS } from '@/mock-bridge/fixtures/raw-logs';
import { tailFilteredLogs } from '@/mock-bridge/log-filter';
import { pretty } from '@/mock-bridge/rpc';
import { formatInt } from '@/shared/lib/format';
import { Section } from '@/shared/ui/section';
import { TabPanel, Tabs } from '@/shared/ui/tabs';
import { BENCHMARKS, type Benchmark } from '../model/benchmarks';
import { DEFAULT_CYCLES, DEFAULT_PRICE_PER_MTOK, computeEconomy } from '../model/economy';
import { CompareSlider } from './compare-slider';
import { EconomyCard } from './economy-card';
import { EconomyControls } from './economy-controls';
import { ReductionBanner } from './reduction-banner';

const TABS = BENCHMARKS.map((benchmark) => ({ id: benchmark.id, label: benchmark.label }));
const EXCERPT_LINES = 14;

/** Runs the real mock filter so the "after" pane is genuine tool output. */
function filteredExcerpt(benchmark: Benchmark): string {
  const outcome = tailFilteredLogs({
    container: benchmark.container,
    filter_pattern: benchmark.filterPattern,
    tail_lines: 200,
    strip_ansi: true,
    token_budget: benchmark.bridgedTokens,
  });
  return outcome.ok ? pretty(outcome.result) : outcome.message;
}

const rawFacts = (b: Benchmark): string[] => [
  `${formatInt(b.rawLines)} raw log lines ingested verbatim`,
  `${formatInt(b.ansiSequences)} ANSI escape sequences`,
  `${formatInt(b.duplicateLines)} redundant lines`,
];

const bridgedFacts = (b: Benchmark): string[] => [
  `${b.bridgedLines} distinct ${b.bridgedLines === 1 ? 'event' : 'events'} returned, repeats collapsed`,
  'ANSI codes sanitized, formatted JSON summary',
  'Hard token budget: zero context bloat',
];

export const TokenEconomySection = memo(function TokenEconomySection() {
  const [activeId, setActiveId] = useState(BENCHMARKS[0]?.id ?? '');
  const [cycles, setCycles] = useState(DEFAULT_CYCLES);
  const [price, setPrice] = useState(DEFAULT_PRICE_PER_MTOK);
  const benchmark = BENCHMARKS.find((entry) => entry.id === activeId) ?? BENCHMARKS[0];
  const filtered = useMemo(() => (benchmark ? filteredExcerpt(benchmark) : ''), [benchmark]);
  if (!benchmark) return null;
  const economy = computeEconomy(benchmark, price, cycles);

  return (
    <Section
      id="economy"
      index="03"
      eyebrow="Token & context economy"
      title="Stop paying to read log noise"
      lead="Piping docker logs into the context window spends tokens on stack-trace padding, colour codes and the same line a thousand times. The bridge returns only what the agent needs."
    >
      <div className="space-y-6">
        <Tabs label="Incident benchmark" idPrefix="economy" tabs={TABS} active={benchmark.id} onChange={setActiveId} />
        <TabPanel idPrefix="economy" active={benchmark.id} className="space-y-6">
          <CompareSlider rawLines={RAW_LOGS[benchmark.container].slice(-EXCERPT_LINES)} filtered={filtered} />
          <EconomyControls cycles={cycles} price={price} onCycles={setCycles} onPrice={setPrice} />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <EconomyCard testId="economy-raw" tone="crit" title="Agent with a plain shell" subtitle="docker logs · raw bash" side={economy.raw} cycles={cycles} facts={rawFacts(benchmark)} />
            <EconomyCard testId="economy-bridged" tone="ok" title="With DockerBridge MCP" subtitle="docker_tail_filtered_logs" side={economy.bridged} cycles={cycles} facts={bridgedFacts(benchmark)} />
          </div>
          <ReductionBanner economy={economy} />
          <p className="font-mono text-[11px] text-ink-mute">
            Illustrative figures from the simulated stack on this page. Token counts are estimates (~4 characters per token).
          </p>
        </TabPanel>
      </div>
    </Section>
  );
});
