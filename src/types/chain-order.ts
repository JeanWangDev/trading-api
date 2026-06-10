export type ChainOrderSide = "long" | "short";
export type ChainOrderType = "market" | "limit";
export type ChainMarketType = "perp" | "spot";
export type ChainOrderStatus =
  | "submitted"
  | "confirmed"
  | "failed"
  | "closed"
  | "cancelled";

export interface ChainOrderRecord {
  id: number;
  orderId: string;
  userId: number;
  walletAddress: string;
  chain: string;
  chainId: string;
  protocol: string;
  contractAddress: string | null;
  txHash: string;
  txStatus: ChainOrderStatus;
  receiptStatus: string | null;
  blockNumber: string | null;
  symbol: string;
  pairLabel: string;
  marketType: ChainMarketType;
  side: ChainOrderSide;
  orderType: ChainOrderType;
  marginUsdt: string;
  leverage: string;
  leverageX100: number | null;
  notionalUsdt: string | null;
  slippagePercent: string | null;
  entryPrice: string | null;
  currentPrice: string | null;
  exitPrice: string | null;
  pnlUsdt: string | null;
  pnlPercent: string | null;
  unrealizedPnlUsdt: string | null;
  unrealizedPnlPercent: string | null;
  pnlSource: "realized" | "market_estimate" | "none";
  strategyId: string | null;
  strategyName: string | null;
  agentId: string | null;
  agentName: string | null;
  signalId: string | null;
  source: string;
  createdAt: number;
  updatedAt: number;
}

export interface ChainOrderPerformanceItem {
  strategyId: string;
  strategyName: string;
  totalOrders: number;
  confirmedOrders: number;
  closedOrders: number;
  failedOrders: number;
  totalPnlUsdt: string;
  realizedPnlUsdt: string;
  unrealizedPnlUsdt: string;
  avgPnlPercent: string | null;
  winRate: string | null;
}
