import { clamp } from '@/shared/lib/format';
import { Field, RangeInput, TextInput } from '@/shared/ui/field';

interface EconomyControlsProps {
  cycles: number;
  price: number;
  onCycles: (cycles: number) => void;
  onPrice: (price: number) => void;
}

const MIN_PRICE = 0.1;
const MAX_PRICE = 100;

/** Session length and token price: the two assumptions a reader may want to change. */
export function EconomyControls({ cycles, price, onCycles, onPrice }: EconomyControlsProps) {
  const changePrice = (raw: string): void => {
    const next = Number(raw);
    if (Number.isFinite(next)) onPrice(clamp(next, MIN_PRICE, MAX_PRICE));
  };
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_12rem]">
      <Field label="Debug cycles in one session" htmlFor="economy-cycles" hint={`${cycles} cycles`}>
        <RangeInput
          id="economy-cycles"
          min={1}
          max={40}
          value={cycles}
          onChange={(event) => onCycles(Number(event.target.value))}
        />
      </Field>
      <Field label="Input price" htmlFor="economy-price" hint="USD / MTok">
        <TextInput
          id="economy-price"
          type="number"
          inputMode="decimal"
          min={MIN_PRICE}
          max={MAX_PRICE}
          step={0.5}
          value={price}
          onChange={(event) => changePrice(event.target.value)}
        />
      </Field>
    </div>
  );
}
