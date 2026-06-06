import { config } from "@/config";
import { EventService } from "@/services/events/event.service";
import { BRIEF_RULES } from "@/services/market/brief-rules";
import MarketService from "@/services/market/market.service";
import type {
  BriefLight,
  BriefSignal,
  BriefSignalChange,
  BriefTrend,
  MarketBriefCheck,
  MarketBriefResponse,
  MarketBriefTopEvent,
} from "@/types/market-brief";
import { fetchJson } from "@/utils/http-client";
import type { CanonicalInterval } from "@/types/market";

export interface MarketBriefQuery {
  exchange?: string;
  symbol: string;
  interval: CanonicalInterval;
}

const CACHE_TTL_MS = 90_000;
const cache = new Map<string, { expiresAt: number; data: MarketBriefResponse }>();
const previousLightCache = new Map<string, BriefLight>();

function cacheKey(query: MarketBriefQuery): string {
  return `${query.exchange ?? "binance"}|${query.symbol}|${query.interval}`;
}

function baseFromPair(symbol: string): string {
  const upper = symbol.trim().toUpperCase();
  if (upper.endsWith("USDT")) return upper.slice(0, -4);
  if (upper.endsWith("USDC")) return upper.slice(0, -4);
  return upper;
}

function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function computeTrend(closes: number[]): BriefTrend {
  const fast = sma(closes, BRIEF_RULES.trendMaFast);
  const slow = sma(closes, BRIEF_RULES.trendMaSlow);
  const last = closes.at(-1);
  if (last === undefined || fast === null || slow === null) return "sideways";

  if (last > fast && fast > slow) return "up";
  if (last < fast && fast < slow) return "down";
  return "sideways";
}

function nearestBelow(price: number, levels: number[]): number | null {
  const below = levels.filter((v) => v < price).sort((a, b) => b - a);
  return below[0] ?? null;
}

function nearestAbove(price: number, levels: number[]): number | null {
  const above = levels.filter((v) => v > price).sort((a, b) => a - b);
  return above[0] ?? null;
}

async function fetchFearGreed(): Promise<{ value: number; label: string } | null> {
  try {
    const res = await fetchJson<{
      data?: Array<{ value: string; value_classification?: string }>;
    }>("https://api.alternative.me/fng/?limit=1");
    const row = res.data?.[0];
    if (!row) return null;
    const value = Number(row.value);
    if (!Number.isFinite(value)) return null;
    return {
      value,
      label:
        row.value_classification ??
        (value >= 55 ? "Greed" : value <= 45 ? "Fear" : "Neutral"),
    };
  } catch {
    return null;
  }
}

async function fetchFundingRate(symbol: string): Promise<number | null> {
  try {
    const target = symbol.trim().toUpperCase();
    const res = await fetchJson<{ lastFundingRate?: string }>(
      `https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${encodeURIComponent(target)}`,
    );
    const rate = Number(res.lastFundingRate);
    return Number.isFinite(rate) ? rate : null;
  } catch {
    return null;
  }
}

function evaluatePosition(
  price: number,
  supports: number[],
  resistances: number[],
): {
  position: "near_support" | "near_resistance" | "middle";
  support: number | null;
  resistance: number | null;
  distSupportPct: number | null;
  distResistancePct: number | null;
} {
  const support = nearestBelow(price, supports);
  const resistance = nearestAbove(price, resistances);
  const distSupportPct =
    support && price > 0 ? ((price - support) / price) * 100 : null;
  const distResistancePct =
    resistance && price > 0 ? ((resistance - price) / price) * 100 : null;

  const nearSupport =
    distSupportPct !== null &&
    distSupportPct <= BRIEF_RULES.nearLevelPct &&
    distSupportPct >= 0;
  const nearResistance =
    distResistancePct !== null &&
    distResistancePct <= BRIEF_RULES.nearLevelPct &&
    distResistancePct >= 0;

  if (nearSupport && !nearResistance) {
    return {
      position: "near_support",
      support,
      resistance,
      distSupportPct,
      distResistancePct,
    };
  }
  if (nearResistance && !nearSupport) {
    return {
      position: "near_resistance",
      support,
      resistance,
      distSupportPct,
      distResistancePct,
    };
  }
  if (nearSupport && nearResistance) {
    const pos =
      (distSupportPct ?? 999) <= (distResistancePct ?? 999)
        ? "near_support"
        : "near_resistance";
    return {
      position: pos,
      support,
      resistance,
      distSupportPct,
      distResistancePct,
    };
  }

  return {
    position: "middle",
    support,
    resistance,
    distSupportPct,
    distResistancePct,
  };
}

function fundingTone(rate: number | null): "high" | "low" | "neutral" {
  if (rate === null) return "neutral";
  if (rate >= BRIEF_RULES.fundingHigh) return "high";
  if (rate <= BRIEF_RULES.fundingLow) return "low";
  return "neutral";
}

function fearGreedTone(value: number | null): "fear" | "greed" | "neutral" {
  if (value === null) return "neutral";
  if (value <= BRIEF_RULES.fearGreedFear) return "fear";
  if (value >= BRIEF_RULES.fearGreedGreed) return "greed";
  return "neutral";
}

function lightRank(light: BriefLight): number {
  if (light === "green") return 2;
  if (light === "red") return 0;
  return 1;
}

function resolveSignalChange(
  prev: BriefLight | null,
  next: BriefLight,
): BriefSignalChange | null {
  if (!prev || prev === next) return "unchanged";
  const d = lightRank(next) - lightRank(prev);
  if (d > 0) return "stronger";
  if (d < 0) return "weaker";
  return "unchanged";
}

function buildPriceGuide(
  price: number,
  pos: ReturnType<typeof evaluatePosition>,
): MarketBriefResponse["priceGuide"] {
  const support = pos.support;
  const resistance = pos.resistance;
  const stopBelow =
    support && support > 0
      ? support * (1 - BRIEF_RULES.stopBelowSupportPct / 100)
      : null;

  let entryHint = "暂无明确支撑，不建议盲目抄底";
  if (pos.position === "near_support" && support) {
    entryHint = `可参考支撑 ${formatPrice(support)} 附近分批，需等企稳`;
  } else if (support) {
    entryHint = `若回踩 ${formatPrice(support)} 企稳，再考虑轻仓`;
  }

  let stopHint = "止损请设在近期结构低点下方";
  if (stopBelow) {
    stopHint = `止损参考 ${formatPrice(stopBelow)} 下方（支撑下约 ${BRIEF_RULES.stopBelowSupportPct}%）`;
  }

  let takeProfitHint = "止盈可参考上方压力位分批";
  if (resistance) {
    takeProfitHint = `第一止盈参考压力 ${formatPrice(resistance)}，到位可减仓`;
  }

  return {
    support,
    resistance,
    entryHint,
    stopHint,
    takeProfitHint,
  };
}

function buildBrief(input: {
  symbol: string;
  interval: CanonicalInterval;
  price: number;
  change24h: number;
  change24hPct: number;
  trend: BriefTrend;
  supports: number[];
  resistances: number[];
  fundingRate: number | null;
  fearGreed: { value: number; label: string } | null;
  recentBearish: number;
  recentBullish: number;
  topEvent: MarketBriefTopEvent | null;
  previousLight: BriefLight | null;
}): MarketBriefResponse {
  const pos = evaluatePosition(input.price, input.supports, input.resistances);
  const funding = fundingTone(input.fundingRate);
  const fg = fearGreedTone(input.fearGreed?.value ?? null);

  let bullish = 0;
  let bearish = 0;
  let neutral = 0;
  const hits: string[] = [];
  const checks: MarketBriefCheck[] = [];

  if (pos.position === "near_support") {
    bullish += 1;
    hits.push("near_support");
    checks.push({
      id: "position",
      label: `接近支撑${pos.support ? ` ${formatPrice(pos.support)}` : ""}`,
      status: "ok",
      panel: "levels",
    });
  } else if (pos.position === "near_resistance") {
    bearish += 1;
    hits.push("near_resistance");
    checks.push({
      id: "position",
      label: `接近压力${pos.resistance ? ` ${formatPrice(pos.resistance)}` : ""}`,
      status: "warn",
      panel: "levels",
    });
  } else {
    neutral += 1;
    checks.push({
      id: "position",
      label: "价格在支撑与压力之间震荡",
      status: "warn",
      panel: "levels",
    });
    hits.push("middle_range");
  }

  if (input.trend === "up") {
    bullish += 1;
    hits.push("trend_up");
    checks.push({
      id: "trend",
      label: "短期趋势偏多（价格在均线上方）",
      status: "ok",
    });
  } else if (input.trend === "down") {
    bearish += 1;
    hits.push("trend_down");
    checks.push({
      id: "trend",
      label: "短期趋势偏空（价格在均线下方）",
      status: "bad",
    });
  } else {
    neutral += 1;
    checks.push({
      id: "trend",
      label: "短期趋势震荡",
      status: "warn",
    });
  }

  const changePct = input.change24hPct;
  if (changePct <= -3) {
    bearish += 1;
    hits.push("change24h_down");
    checks.push({
      id: "change24h",
      label: `24h 下跌 ${round2(Math.abs(changePct))}%`,
      status: "bad",
    });
  } else if (changePct >= 3) {
    bullish += 1;
    hits.push("change24h_up");
    checks.push({
      id: "change24h",
      label: `24h 上涨 ${round2(changePct)}%`,
      status: "ok",
    });
  } else {
    neutral += 1;
    checks.push({
      id: "change24h",
      label: `24h 涨跌 ${changePct >= 0 ? "+" : ""}${round2(changePct)}%`,
      status: "warn",
    });
  }

  if (funding === "high") {
    bearish += 1;
    hits.push("funding_high");
    checks.push({
      id: "funding",
      label: "资金费率偏高，多头偏拥挤",
      status: "bad",
    });
  } else if (funding === "low") {
    bullish += 1;
    hits.push("funding_low");
    checks.push({
      id: "funding",
      label: "资金费率偏低或偏负",
      status: "ok",
    });
  } else {
    neutral += 1;
    checks.push({
      id: "funding",
      label: "资金费率中性",
      status: "warn",
    });
  }

  if (fg === "fear") {
    bullish += 1;
    hits.push("fear_greed_fear");
    checks.push({
      id: "sentiment",
      label: `市场偏恐惧（${input.fearGreed?.value ?? "—"}）`,
      status: "ok",
    });
  } else if (fg === "greed") {
    bearish += 1;
    hits.push("fear_greed_greed");
    checks.push({
      id: "sentiment",
      label: `市场偏贪婪（${input.fearGreed?.value ?? "—"}）`,
      status: "bad",
    });
  } else {
    neutral += 1;
    checks.push({
      id: "sentiment",
      label: input.fearGreed
        ? `情绪中性（${input.fearGreed.value}）`
        : "情绪数据暂不可用",
      status: "warn",
    });
  }

  if (input.recentBearish > input.recentBullish && input.recentBearish > 0) {
    bearish += 1;
    hits.push("events_bearish");
    checks.push({
      id: "events",
      label: `近 24h 偏空事件 ${input.recentBearish} 条`,
      status: "bad",
      panel: "events",
    });
  } else if (input.recentBullish > input.recentBearish && input.recentBullish > 0) {
    bullish += 1;
    hits.push("events_bullish");
    checks.push({
      id: "events",
      label: `近 24h 偏多事件 ${input.recentBullish} 条`,
      status: "ok",
      panel: "events",
    });
  } else {
    neutral += 1;
    checks.push({
      id: "events",
      label: "近期相关事件较少或方向不明",
      status: "warn",
      panel: "events",
    });
  }

  let signal: BriefSignal = "neutral";
  let light: BriefLight = "yellow";
  let actionLevel: MarketBriefResponse["actionLevel"] = "wait";

  if (
    bullish >= BRIEF_RULES.bullishMinScore &&
    bearish <= BRIEF_RULES.maxOppositeScore
  ) {
    signal = "bullish";
    light = "green";
    actionLevel = "light_long";
  } else if (
    bearish >= BRIEF_RULES.bearishMinScore &&
    bullish <= BRIEF_RULES.maxOppositeScore
  ) {
    signal = "bearish";
    light = "red";
    actionLevel = "reduce";
  } else if (bearish >= 2 && bullish >= 2) {
    actionLevel = "caution";
  }

  const summary = buildSummary(signal, pos, funding, fg, input.trend, changePct);
  const actionHint = buildActionHint(signal, pos, funding, actionLevel);
  const priceGuide = buildPriceGuide(input.price, pos);
  const signalChange = resolveSignalChange(input.previousLight, light);

  return {
    symbol: input.symbol,
    interval: input.interval,
    price: input.price,
    change24h: input.change24h,
    change24hPct: input.change24hPct,
    trend: input.trend,
    signal,
    light,
    previousLight: input.previousLight,
    signalChange,
    summary,
    actionHint,
    actionLevel,
    checks,
    score: {
      bullish,
      bearish,
      neutral,
      total: bullish + bearish + neutral,
    },
    priceGuide,
    topEvent: input.topEvent,
    factors: {
      price: input.price,
      change24h: input.change24h,
      change24hPct: round2(input.change24hPct),
      trend: input.trend,
      nearestSupport: pos.support,
      nearestResistance: pos.resistance,
      distSupportPct:
        pos.distSupportPct !== null ? round2(pos.distSupportPct) : null,
      distResistancePct:
        pos.distResistancePct !== null ? round2(pos.distResistancePct) : null,
      fundingRate: input.fundingRate,
      fundingRatePct:
        input.fundingRate !== null ? round4(input.fundingRate * 100) : null,
      fearGreed: input.fearGreed?.value ?? null,
      fearGreedLabel: input.fearGreed?.label ?? null,
      recentBullish: input.recentBullish,
      recentBearish: input.recentBearish,
      bullishScore: bullish,
      bearishScore: bearish,
      neutralScore: neutral,
    },
    hits,
    disclaimer: "仅供参考，不构成投资建议。信号矛盾时建议观望，不操作。",
    updatedAt: new Date().toISOString(),
  };
}

function buildSummary(
  signal: BriefSignal,
  pos: ReturnType<typeof evaluatePosition>,
  funding: ReturnType<typeof fundingTone>,
  fg: ReturnType<typeof fearGreedTone>,
  trend: BriefTrend,
  change24hPct: number,
): string {
  if (signal === "bullish") {
    return "多项因素偏多，可关注回踩支撑后的机会，不宜盲目追高。";
  }
  if (signal === "bearish") {
    return "多项因素偏空，宜谨慎追高，已有仓位可考虑分批止盈。";
  }
  if (change24hPct <= -5) {
    return "24h 跌幅较大，即便接近支撑也宜等待企稳，勿急于抄底。";
  }
  if (pos.position === "near_resistance" && funding === "high") {
    return "价格靠近压力且费率偏高，整体偏谨慎。";
  }
  if (pos.position === "near_support" && fg === "fear" && trend !== "down") {
    return "价格靠近支撑且情绪偏冷，可观望企稳信号。";
  }
  return "多空信号不一致，建议观望，等待更明确方向。";
}

function buildActionHint(
  signal: BriefSignal,
  pos: ReturnType<typeof evaluatePosition>,
  funding: ReturnType<typeof fundingTone>,
  actionLevel: MarketBriefResponse["actionLevel"],
): string {
  if (actionLevel === "light_long") {
    const stop =
      pos.support && pos.support > 0
        ? `止损可参考支撑 ${formatPrice(pos.support)} 下方`
        : "止损请设在近期低点下方";
    return `可考虑小仓位试多；${stop}。`;
  }
  if (actionLevel === "reduce") {
    return "不宜追多；若持有仓位，可在压力位附近考虑减仓。";
  }
  if (actionLevel === "caution") {
    return "多空交织，观望为主；勿重仓单边押注。";
  }
  if (pos.position === "near_resistance" || funding === "high") {
    return "观望为主，不追高；等待回踩或信号一致后再考虑建仓。";
  }
  return "观望为主；信号一致前不建议重仓操作。";
}

function formatPrice(value: number): string {
  if (value >= 1000) return value.toFixed(2);
  if (value >= 1) return value.toFixed(4);
  return value.toFixed(6);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

class MarketBriefService {
  async getBrief(query: MarketBriefQuery): Promise<MarketBriefResponse> {
    const key = cacheKey(query);
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const exchange = query.exchange;
    const symbol = query.symbol.toUpperCase();
    const base = baseFromPair(symbol);
    const previousLight = previousLightCache.get(key) ?? null;

    const [ticker, levels, fearGreed, fundingRate, klinesResult] =
      await Promise.all([
        MarketService.getTicker24h({ exchange, symbol }),
        MarketService.getPriceLevels({
          exchange,
          symbol,
          interval: query.interval,
          limit: 3,
        }),
        fetchFearGreed(),
        fetchFundingRate(symbol),
        MarketService.getKlines({
          exchange,
          symbol,
          interval: query.interval,
          limit: BRIEF_RULES.klineLookback,
        }),
      ]);

    const price = ticker.lastPrice;
    const closes = klinesResult.bars.map((b) => b.close);
    const trend = computeTrend(closes);

    let recentBullish = 0;
    let recentBearish = 0;
    let topEvent: MarketBriefTopEvent | null = null;

    if (config.db.enabled) {
      try {
        const since = Date.now() - 86_400_000;
        const events = await EventService.listForChart({
          symbol: base,
          from: since,
          to: Date.now(),
          limit: 30,
        });
        for (const ev of events) {
          if (ev.sentiment === "bullish") recentBullish += 1;
          else if (ev.sentiment === "bearish") recentBearish += 1;
        }
        const sorted = [...events].sort((a, b) => b.publishedAt - a.publishedAt);
        const latest = sorted[0];
        if (latest) {
          topEvent = {
            id: latest.id,
            title: latest.title,
            sentiment: latest.sentiment,
            publishedAt: latest.publishedAt,
          };
        }
      } catch {
        /* events optional */
      }
    }

    const data = buildBrief({
      symbol,
      interval: query.interval,
      price,
      change24h: ticker.priceChange,
      change24hPct: ticker.priceChangePercent,
      trend,
      supports: levels.supports,
      resistances: levels.resistances,
      fundingRate,
      fearGreed,
      recentBullish,
      recentBearish,
      topEvent,
      previousLight,
    });

    previousLightCache.set(key, data.light);
    cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, data });
    return data;
  }
}

export default new MarketBriefService();
