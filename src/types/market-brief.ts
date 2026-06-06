export type BriefSignal = "bullish" | "bearish" | "neutral";
export type BriefLight = "green" | "yellow" | "red";
export type BriefCheckStatus = "ok" | "warn" | "bad";
export type BriefTrend = "up" | "down" | "sideways";
export type BriefSignalChange = "stronger" | "weaker" | "unchanged";
export type BriefCheckPanel = "levels" | "events" | null;

export interface MarketBriefCheck {
  id: string;
  label: string;
  status: BriefCheckStatus;
  panel?: BriefCheckPanel;
}

export interface MarketBriefTopEvent {
  id: string;
  title: string;
  sentiment: string;
  publishedAt: number;
}

export interface MarketBriefPriceGuide {
  support: number | null;
  resistance: number | null;
  entryHint: string;
  stopHint: string;
  takeProfitHint: string;
}

export interface MarketBriefScore {
  bullish: number;
  bearish: number;
  neutral: number;
  total: number;
}

export interface MarketBriefResponse {
  symbol: string;
  interval: string;
  price: number;
  change24h: number;
  change24hPct: number;
  trend: BriefTrend;
  signal: BriefSignal;
  light: BriefLight;
  previousLight: BriefLight | null;
  signalChange: BriefSignalChange | null;
  summary: string;
  actionHint: string;
  actionLevel: "wait" | "caution" | "light_long" | "reduce";
  checks: MarketBriefCheck[];
  score: MarketBriefScore;
  priceGuide: MarketBriefPriceGuide;
  topEvent: MarketBriefTopEvent | null;
  factors: Record<string, string | number | boolean | null>;
  hits: string[];
  disclaimer: string;
  updatedAt: string;
}
