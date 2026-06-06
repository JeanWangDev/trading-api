import type { IKline } from "@/types/market";

export type PriceLevelsResult = {
  symbol: string;
  interval: string;
  price: number;
  supports: number[];
  resistances: number[];
};

const PIVOT_RADIUS = 5;
const MERGE_RATIO = 0.003;

function mergeCloseLevels(levels: number[]): number[] {
  if (levels.length === 0) return [];

  const sorted = [...levels].sort((a, b) => a - b);
  const merged: number[] = [];
  let bucket = sorted[0];

  for (let i = 1; i < sorted.length; i += 1) {
    const next = sorted[i];
    const base = (bucket + next) / 2;
    if (base > 0 && Math.abs(next - bucket) / base <= MERGE_RATIO) {
      bucket = (bucket + next) / 2;
    } else {
      merged.push(bucket);
      bucket = next;
    }
  }

  merged.push(bucket);
  return merged;
}

function pickNearestBelow(price: number, candidates: number[], limit: number): number[] {
  return candidates
    .filter((level) => level < price)
    .sort((a, b) => b - a)
    .slice(0, limit);
}

function pickNearestAbove(price: number, candidates: number[], limit: number): number[] {
  return candidates
    .filter((level) => level > price)
    .sort((a, b) => a - b)
    .slice(0, limit);
}

export function computePriceLevelsFromBars(
  bars: IKline[],
  limit = 3,
): Pick<PriceLevelsResult, "price" | "supports" | "resistances"> {
  if (bars.length < PIVOT_RADIUS * 2 + 1) {
    const price = bars.at(-1)?.close ?? 0;
    return { price, supports: [], resistances: [] };
  }

  const pivotHighs: number[] = [];
  const pivotLows: number[] = [];

  for (let i = PIVOT_RADIUS; i < bars.length - PIVOT_RADIUS; i += 1) {
    const bar = bars[i];
    let isHigh = true;
    let isLow = true;

    for (let j = i - PIVOT_RADIUS; j <= i + PIVOT_RADIUS; j += 1) {
      if (j === i) continue;
      if (bars[j].high >= bar.high) isHigh = false;
      if (bars[j].low <= bar.low) isLow = false;
    }

    if (isHigh) pivotHighs.push(bar.high);
    if (isLow) pivotLows.push(bar.low);
  }

  const price = bars.at(-1)?.close ?? 0;
  const supports = pickNearestBelow(price, mergeCloseLevels(pivotLows), limit);
  const resistances = pickNearestAbove(price, mergeCloseLevels(pivotHighs), limit);

  return { price, supports, resistances };
}
