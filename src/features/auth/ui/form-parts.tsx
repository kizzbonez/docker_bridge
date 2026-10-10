import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { cx } from '@/shared/lib/cx';
import { Button } from '@/shared/ui/button';
import { TextInput } from '@/shared/ui/field';

/** Error line for a form. Rendered always, so screen readers hear changes. */
export function FormError({ message }: { message: string | null }) {
  return (
    <p role="alert" className={cx('min-h-5 text-sm text-red-400', !message && 'sr-only')}>
      {message}
    </p>
  );
}

interface SubmitProps {
  pending: boolean;
  disabled?: boolean;
  children: ReactNode;
}

export function SubmitButton({ pending, disabled = false, children }: SubmitProps) {
  return (
    <Button type="submit" variant="primary" className="w-full" disabled={pending || disabled} aria-busy={pending}>
      {pending ? 'Working…' : children}
    </Button>
  );
}

/** Password field with a show/hide toggle. */
export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <TextInput {...props} type={visible ? 'text' : 'password'} className="pr-16" />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-pressed={visible}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute inset-y-0 right-0 px-3 font-mono text-xs text-ink-mute hover:text-cyan-300"
      >
        {visible ? 'hide' : 'show'}
      </button>
    </div>
  );
}

/** Six-digit authenticator code. One input: paste and OS autofill both work. */
export function CodeInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <TextInput
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]{6}"
      maxLength={6}
      placeholder="000000"
      className="text-center text-xl tracking-[0.5em]"
      {...props}
    />
  );
}
