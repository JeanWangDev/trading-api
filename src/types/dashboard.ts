export interface TrendPoint {
  label: string;
  value: number;
}

export interface MarketAssetSnapshot {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  signal: string;
}

export interface SentimentSnapshot {
  value: number;
  label: string;
  description: string;
  trend: TrendPoint[];
}

export interface DerivativesSnapshot {
  fundingRateAvg: number;
  longShortRatio: number;
  liquidations24h: number;
  liquidationBias: string;
}

export interface ExchangeBalanceSnapshot {
  symbol: string;
  change24h: number;
  commentary: string;
}

export interface WhaleAlert {
  asset: string;
  amountUsd: number;
  direction: "inflow" | "outflow";
  source: string;
  timeAgo: string;
  impact: string;
}

export interface QuickSignal {
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
}

export interface DashboardOverviewResponse {
  updatedAt: string;
  marketBias: string;
  summary: string;
  market: MarketAssetSnapshot[];
  sentiment: SentimentSnapshot;
  derivatives: DerivativesSnapshot;
  stablecoinNetflow: TrendPoint[];
  exchangeBalance: ExchangeBalanceSnapshot[];
  whaleAlerts: WhaleAlert[];
  quickSignals: QuickSignal[];
}
