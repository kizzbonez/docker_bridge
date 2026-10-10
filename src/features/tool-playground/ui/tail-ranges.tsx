import { Field, RangeInput } from '@/shared/ui/field';

interface Ranges {
  tail_lines: number;
  token_budget: number;
}

interface TailRangesProps {
  args: Ranges;
  patch: (change: Partial<Ranges>) => void;
  /** Upper ends of the sliders: the playground's fixture log is short, a real one is not. */
  maxTail: number;
  maxBudget: number;
}

/** The two sliders of `docker_tail_filtered_logs`: how far back to look, and how much to return. */
export function TailRanges({ args, patch, maxTail, maxBudget }: TailRangesProps) {
  return (
    <>
      <Field label="tail_lines" htmlFor="logs-tail" hint={args.tail_lines}>
        <RangeInput id="logs-tail" min={10} max={maxTail} step={10} value={args.tail_lines} onChange={(event) => patch({ tail_lines: Number(event.target.value) })} />
      </Field>
      <Field label="token_budget" htmlFor="logs-budget" hint={`${args.token_budget} tokens`}>
        <RangeInput id="logs-budget" min={64} max={maxBudget} step={32} value={args.token_budget} onChange={(event) => patch({ token_budget: Number(event.target.value) })} />
      </Field>
    </>
  );
}
