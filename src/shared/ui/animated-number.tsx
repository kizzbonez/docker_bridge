import { useCountUp } from '@/shared/hooks/use-count-up';
import { useInView } from '@/shared/hooks/use-in-view';
import { cx } from '@/shared/lib/cx';
import { formatInt } from '@/shared/lib/format';

interface AnimatedNumberProps {
  value: number;
  format?: (value: number) => string;
  className?: string;
}

/** Counts up to `value` the first time it scrolls into view, and on every change. */
export function AnimatedNumber({ value, format = formatInt, className }: AnimatedNumberProps) {
  const [ref, seen] = useInView<HTMLSpanElement>();
  const current = useCountUp(value, seen);
  return (
    <span ref={ref} className={cx('tabular-nums', className)}>
      {format(current)}
    </span>
  );
}
