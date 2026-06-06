import { config } from "@/config";
import { EventService } from "@/services/events";
import {
  type DashboardOverviewResponse,
  type ExchangeBalanceSnapshot,
  type MarketAssetSnapshot,
  type QuickSignal,
  type TrendPoint,
  type WhaleAlert,
} from "@/types/dashboard";

const market: MarketAssetSnapshot[] = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    price: 69420.52,
    change24h: 2.84,
    volume24h: 28400000000,
    signal: "现货买盘稳步增强",
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    price: 3788.31,
    change24h: 4.12,
    volume24h: 13600000000,
    signal: "资金轮动回流主流公链",
  },
];

const sentimentTrend: TrendPoint[] = [
  { label: "Mon", value: 45 },
  { label: "Tue", value: 49 },
  { label: "Wed", value: 57 },
  { label: "Thu", value: 61 },
  { label: "Fri", value: 64 },
  { label: "Sat", value: 66 },
  { label: "Sun", value: 68 },
];

const stablecoinNetflow: TrendPoint[] = [
  { label: "00:00", value: -12 },
  { label: "04:00", value: 18 },
  { label: "08:00", value: 34 },
  { label: "12:00", value: 29 },
  { label: "16:00", value: 52 },
  { label: "20:00", value: 41 },
];

const exchangeBalance: ExchangeBalanceSnapshot[] = [
  {
    symbol: "BTC",
    change24h: -0.78,
    commentary: "交易所余额继续下降，偏向筹码外流。",
  },
  {
    symbol: "ETH",
    change24h: -1.42,
    commentary: "ETH 交易所库存降幅更快，短线偏强。",
  },
];

const fallbackWhaleAlerts: WhaleAlert[] = [
  {
    asset: "BTC",
    amountUsd: 18500000,
    direction: "outflow",
    source: "Binance -> Unknown Wallet",
    timeAgo: "4 分钟前",
    impact: "大额提币偏多头，需跟踪是否进入冷钱包。",
  },
];

const fallbackQuickSignals: QuickSignal[] = [
  {
    title: "情绪升温但未极热",
    description: "恐惧贪婪指数位于 68，尚未进入过热区，趋势仍偏多。",
    severity: "low",
  },
];

function formatTimeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${Math.max(1, mins)} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

function mapSignalsFromEvents(
  events: Awaited<ReturnType<typeof EventService.listRecent>>,
): WhaleAlert[] {
  const signals = events.filter((e) => e.type === "liquidation");

  if (signals.length === 0) {
    return fallbackWhaleAlerts;
  }

  return signals.slice(0, 5).map((e) => ({
    asset: e.symbols[0] ?? "CRYPTO",
    amountUsd: Math.max(1_000_000, e.impact * 500_000),
    direction: e.sentiment === "bullish" ? "inflow" : "outflow",
    source: e.title,
    timeAgo: formatTimeAgo(e.publishedAt),
    impact: e.description.slice(0, 120),
  }));
}

function mapQuickSignalsFromEvents(
  events: Awaited<ReturnType<typeof EventService.listRecent>>,
): QuickSignal[] {
  if (events.length === 0) return fallbackQuickSignals;

  return events.slice(0, 5).map((e) => ({
    title: e.title.slice(0, 80),
    description: e.description.slice(0, 160),
    severity: e.impact >= 70 ? "high" : e.impact >= 40 ? "medium" : "low",
  }));
}

class DashboardService {
  async getOverview(): Promise<DashboardOverviewResponse> {
    let whaleAlerts = fallbackWhaleAlerts;
    let quickSignals = fallbackQuickSignals;
    let sentimentValue = 68;
    let sentimentLabel = "Greed";
    let sentimentDescription = "市场情绪回到偏贪婪区间，但尚未出现极端拥挤。";
    let liquidations24h = 142000000;
    let liquidationBias = "空头爆仓占优";

    if (config.db.enabled) {
      try {
        const recent = await EventService.listRecent(12);
        whaleAlerts = mapSignalsFromEvents(recent);
        quickSignals = mapQuickSignalsFromEvents(recent);

        const since24h = Date.now() - 86_400_000;
        const liqCount = await EventService.countByType("liquidation", since24h);
        if (liqCount > 0) {
          liquidations24h = liqCount * 2_500_000;
          liquidationBias = `过去 24h 入库 ${liqCount} 条爆仓事件`;
        }
      } catch (error) {
        console.warn("[dashboard] events fallback to mock:", error);
      }
    }

    return {
      updatedAt: new Date().toISOString(),
      marketBias: sentimentValue >= 55 ? "偏多" : sentimentValue <= 45 ? "偏空" : "中性",
      summary:
        quickSignals[0]?.description ??
        "主流资产价格与稳定币净流入同步抬升，市场处于风险偏好回暖阶段。",
      market,
      sentiment: {
        value: sentimentValue,
        label: sentimentLabel,
        description: sentimentDescription,
        trend: sentimentTrend,
      },
      derivatives: {
        fundingRateAvg: 0.012,
        longShortRatio: 1.14,
        liquidations24h,
        liquidationBias,
      },
      stablecoinNetflow,
      exchangeBalance,
      whaleAlerts,
      quickSignals,
    };
  }
}

export default new DashboardService();
