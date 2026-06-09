import { Strategy, StrategyPaperState, StrategyPaperTrade } from "@/db";
import { STRATEGY_VISIBILITY_PUBLIC } from "@/types/strategy";
import { MarketBriefService } from "@/services/market";
import type { BriefSignal } from "@/types/market-brief";
import type { CanonicalInterval } from "@/types/market";

const INITIAL_EQUITY = 10_000;
const POSITION_FRACTION = 0.95;

function num(value: string | number | null | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function computeSharpe(returns: number[]): number {
  if (returns.length < 2) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (returns.length - 1);
  const std = Math.sqrt(variance);
  if (std <= 0) return 0;
  return (mean / std) * Math.sqrt(252);
}

async function getOrCreateState(strategyKey: string): Promise<StrategyPaperState> {
  let state = await StrategyPaperState.findByPk(strategyKey);
  if (!state) {
    state = await StrategyPaperState.create({
      strategyKey,
      equityUsdt: INITIAL_EQUITY.toFixed(6),
      peakEquityUsdt: INITIAL_EQUITY.toFixed(6),
      positionSide: null,
      entryPrice: null,
      positionNotional: "0",
      lastSignal: null,
      lastPrice: null,
      totalReturnPct: "0",
      maxDrawdownPct: "0",
      sharpeRatio: "0",
      winRate: "0",
      tradeCount: 0,
      winCount: 0,
    });
  }
  return state;
}

async function closePosition(
  state: StrategyPaperState,
  exitPrice: number,
  closedAt: Date,
): Promise<void> {
  const side = state.positionSide;
  const entry = num(state.entryPrice);
  const notional = num(state.positionNotional);
  if (!side || entry <= 0 || notional <= 0) return;

  const qty = notional / entry;
  const pnlUsdt =
    side === "long" ? (exitPrice - entry) * qty : (entry - exitPrice) * qty;
  const pnlPct = (pnlUsdt / notional) * 100;

  const equity = num(state.equityUsdt) + pnlUsdt;
  const peak = Math.max(num(state.peakEquityUsdt), equity);
  const drawdown = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
  const maxDd = Math.max(num(state.maxDrawdownPct), drawdown);
  const tradeCount = state.tradeCount + 1;
  const winCount = state.winCount + (pnlUsdt > 0 ? 1 : 0);
  const winRate = tradeCount > 0 ? (winCount / tradeCount) * 100 : 0;
  const totalReturn = ((equity - INITIAL_EQUITY) / INITIAL_EQUITY) * 100;

  await StrategyPaperTrade.create({
    strategyKey: state.strategyKey,
    side,
    entryPrice: entry.toFixed(8),
    exitPrice: exitPrice.toFixed(8),
    notionalUsdt: notional.toFixed(6),
    pnlUsdt: pnlUsdt.toFixed(6),
    pnlPct: pnlPct.toFixed(4),
    openedAt: state.updateTime,
    closedAt,
  });

  const recent = await StrategyPaperTrade.findAll({
    where: { strategyKey: state.strategyKey },
    order: [["closedAt", "DESC"]],
    limit: 50,
  });
  const sharpe = computeSharpe(recent.map((t) => num(t.pnlPct)));

  await state.update({
    equityUsdt: equity.toFixed(6),
    peakEquityUsdt: peak.toFixed(6),
    positionSide: null,
    entryPrice: null,
    positionNotional: "0",
    totalReturnPct: totalReturn.toFixed(4),
    maxDrawdownPct: maxDd.toFixed(4),
    sharpeRatio: sharpe.toFixed(4),
    winRate: winRate.toFixed(4),
    tradeCount,
    winCount,
  });
}

function targetSide(signal: BriefSignal): "long" | "short" | null {
  if (signal === "bullish") return "long";
  if (signal === "bearish") return "short";
  return null;
}

export class PaperTradingService {
  static async tickStrategy(strategy: Strategy): Promise<BriefSignal | null> {
    const brief = await MarketBriefService.getBrief({
      symbol: strategy.symbol,
      interval: strategy.interval as CanonicalInterval,
    });

    const state = await getOrCreateState(strategy.strategyKey);
    const price = brief.price;
    const signal = brief.signal;
    const now = new Date();

    if (state.positionSide) {
      const desired = targetSide(signal);
      if (!desired || desired !== state.positionSide) {
        await closePosition(state, price, now);
        await state.reload();
      }
    }

    if (!state.positionSide) {
      const openSide = targetSide(signal);
      if (openSide && price > 0) {
        const equity = num(state.equityUsdt);
        const notional = equity * POSITION_FRACTION;
        await state.update({
          positionSide: openSide,
          entryPrice: price.toFixed(8),
          positionNotional: notional.toFixed(6),
          lastPrice: price.toFixed(8),
        });
      }
    }

    await state.update({
      lastSignal: signal,
      lastPrice: price.toFixed(8),
    });

    return signal;
  }

  static async tickAll(): Promise<number> {
    const strategies = await Strategy.findAll({
      where: { status: 1, visibility: STRATEGY_VISIBILITY_PUBLIC },
    });

    let count = 0;
    for (const strategy of strategies) {
      try {
        await PaperTradingService.tickStrategy(strategy);
        count += 1;
      } catch (error) {
        console.error(`[paper] tick failed strategy=${strategy.strategyKey}`, error);
      }
    }
    return count;
  }

  static async getStats(strategyKey: string) {
    const state = await StrategyPaperState.findByPk(strategyKey);
    if (!state) {
      return {
        strategyKey,
        equityUsdt: String(INITIAL_EQUITY),
        totalReturnPct: "0",
        maxDrawdownPct: "0",
        sharpeRatio: "0",
        winRate: "0",
        tradeCount: 0,
        lastSignal: null,
      };
    }

    return {
      strategyKey: state.strategyKey,
      equityUsdt: String(state.equityUsdt),
      totalReturnPct: String(state.totalReturnPct),
      maxDrawdownPct: String(state.maxDrawdownPct),
      sharpeRatio: String(state.sharpeRatio),
      winRate: String(state.winRate),
      tradeCount: state.tradeCount,
      lastSignal: state.lastSignal,
      lastPrice: state.lastPrice ? String(state.lastPrice) : null,
      positionSide: state.positionSide,
    };
  }
}
