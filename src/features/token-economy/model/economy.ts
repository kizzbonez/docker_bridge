import type { Benchmark } from './benchmarks';

/** Reference context window used for the "how many cycles fit" comparison. */
export const CONTEXT_WINDOW = 200_000;
export const DEFAULT_PRICE_PER_MTOK = 3;
export const DEFAULT_CYCLES = 12;

export interface SideEconomy {
  tokensPerCycle: number;
  costPerCycle: number;
  /** Tokens consumed after the chosen number of debug cycles. */
  sessionTokens: number;
  /** sessionTokens as a share of the context window; above 1 means overflow. */
  contextShare: number;
  /** Whole debug cycles that fit in one context window. */
  cyclesThatFit: number;
}

export interface Economy {
  raw: SideEconomy;
  bridged: SideEconomy;
  tokensSaved: number;
  /** Fraction of tokens removed, 0..1. */
  reduction: number;
}

function side(tokensPerCycle: number, pricePerMTok: number, cycles: number): SideEconomy {
  const sessionTokens = tokensPerCycle * cycles;
  return {
    tokensPerCycle,
    costPerCycle: (tokensPerCycle / 1_000_000) * pricePerMTok,
    sessionTokens,
    contextShare: sessionTokens / CONTEXT_WINDOW,
    cyclesThatFit: Math.floor(CONTEXT_WINDOW / tokensPerCycle),
  };
}

export function computeEconomy(benchmark: Benchmark, pricePerMTok: number, cycles: number): Economy {
  return {
    raw: side(benchmark.rawTokens, pricePerMTok, cycles),
    bridged: side(benchmark.bridgedTokens, pricePerMTok, cycles),
    tokensSaved: benchmark.rawTokens - benchmark.bridgedTokens,
    reduction: 1 - benchmark.bridgedTokens / benchmark.rawTokens,
  };
}
