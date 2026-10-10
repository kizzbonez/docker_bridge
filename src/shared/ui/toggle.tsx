interface ToggleProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const TRACK =
  'relative h-5 w-9 shrink-0 rounded-full bg-carbon-600 transition-colors duration-200 ' +
  'peer-checked:bg-cyan-500 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sky-400 ' +
  'after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-ink ' +
  'after:transition-transform after:duration-200 peer-checked:after:translate-x-4';

/** A labelled on/off switch backed by a native checkbox. */
export function Toggle({ id, label, checked, onChange }: ToggleProps) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-cyan-500/15 bg-carbon-950/50 px-3 py-2"
    >
      <span className="font-mono text-xs text-sky-300">{label}</span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span aria-hidden="true" className={TRACK} />
    </label>
  );
}
