import { useClipboard } from '@/shared/hooks/use-clipboard';
import { Button } from './button';
import type { ButtonVariant } from './button-class';

interface CopyButtonProps {
  text: string;
  label?: string;
  copiedLabel?: string;
  variant?: ButtonVariant;
  className?: string;
}

export function CopyButton({ text, label = 'Copy', copiedLabel = 'Copied', variant = 'ghost', className }: CopyButtonProps) {
  const { copied, copy } = useClipboard();
  return (
    <Button variant={variant} className={className} onClick={() => void copy(text)}>
      <span aria-hidden="true">{copied ? '✓' : '⧉'}</span>
      <span aria-live="polite">{copied ? copiedLabel : label}</span>
    </Button>
  );
}
