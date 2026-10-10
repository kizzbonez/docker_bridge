import { useCallback, useEffect, useRef, useState } from 'react';
import { writeClipboard } from '@/shared/lib/clipboard';

interface Clipboard {
  copied: boolean;
  copy: (text: string) => Promise<boolean>;
}

/** Copies text and reports success for `resetMs`, long enough to show feedback. */
export function useClipboard(resetMs = 1800): Clipboard {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      const ok = await writeClipboard(text);
      setCopied(ok);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), resetMs);
      return ok;
    },
    [resetMs],
  );

  return { copied, copy };
}
