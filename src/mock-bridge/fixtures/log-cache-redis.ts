import { clock } from './clock';

const CYCLE = 20;
const CYCLES = 4;

const stamp = (i: number): string => `10 Oct 2026 ${clock(i, 9)}.${String((i * 53) % 1000).padStart(3, '0')}`;

// One boot-to-kill cycle. The kernel OOM killer leaves no line of its own:
// the log simply stops after the background save forks, then boots again.
function cycleLine(offset: number, i: number): string {
  switch (offset) {
    case 0:
      return `1:C ${stamp(i)} * oO0OoO0OoO0Oo Redis is starting oO0OoO0OoO0Oo`;
    case 1:
      return `1:C ${stamp(i)} * Redis version=7.4.1, bits=64, commit=00000000, modified=0, pid=1, just started`;
    case 2:
      return `1:M ${stamp(i)} # WARNING Memory overcommit must be enabled! Without it, a background save may fail under low memory condition.`;
    case 3:
      return `1:M ${stamp(i)} * Ready to accept connections tcp`;
    case CYCLE - 2:
      return `1:M ${stamp(i)} * 10000 changes in 60 seconds. Saving...`;
    case CYCLE - 1:
      return `1:M ${stamp(i)} * Background saving started by pid ${71 + i}`;
    default:
      return offset % 2 === 0
        ? `1:M ${stamp(i)} - DB 0: ${48000 + i * 13} keys (0 volatile) in 65536 slots HT.`
        : `1:M ${stamp(i)} - 24 clients connected (0 replicas), ${238000000 + i * 171000} bytes in use`;
  }
}

/** Redis in a crash loop: four identical boot → save → killed cycles. */
export const CACHE_REDIS_LOG: string[] = Array.from({ length: CYCLE * CYCLES }, (_, i) => cycleLine(i % CYCLE, i));
