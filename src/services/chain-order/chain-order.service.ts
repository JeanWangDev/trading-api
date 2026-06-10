import { randomUUID } from "crypto";
import { Op } from "sequelize";
import { ChainOrder } from "@/db";
import { BadRequestError, NotFoundError } from "@/errors/app-error";
import { config } from "@/config";
import { MarketService } from "@/services/market";
import type {
  ChainMarketType,
  ChainOrderPerformanceItem,
  ChainOrderRecord,
  ChainOrderSide,
  ChainOrderStatus,
  ChainOrderType,
} from "@/types/chain-order";
import type {
  ListChainOrdersQuery,
  UpsertChainOrderBody,
} from "@/validators/chain-order";

function assertDbReady() {
  if (!config.db.enabled) {
    throw new BadRequestError("数据库未启用");
  }
}

function toTime(value: Date | null | undefined): number {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.getTime();
  }
  return Date.now();
}

function normalizeNullableDecimal(value: string | null | undefined): string | null {
  if (value == null || value === "") return null;
  return String(value);
}

function formatDecimal(value: number, digits = 6): string {
  if (!Number.isFinite(value)) return "0";
  return value.toFixed(digits);
}

function deriveStatus(
  txStatus?: ChainOrderStatus,
  receiptStatus?: string | null,
): ChainOrderStatus {
  if (txStatus) return txStatus;
  if (receiptStatus === "0x1") return "confirmed";
  if (receiptStatus === "0x0") return "failed";
  return "submitted";
}

function mapRow(row: ChainOrder): ChainOrderRecord {
  return {
    id: row.id,
    orderId: row.orderId,
    userId: row.userId,
    walletAddress: row.walletAddress,
    chain: row.chain,
    chainId: row.chainId,
    protocol: row.protocol,
    contractAddress: row.contractAddress,
    txHash: row.txHash,
    txStatus: row.txStatus as ChainOrderStatus,
    receiptStatus: row.receiptStatus,
    blockNumber: row.blockNumber,
    symbol: row.symbol,
    pairLabel: row.pairLabel,
    marketType: row.marketType as ChainMarketType,
    side: row.side as ChainOrderSide,
    orderType: row.orderType as ChainOrderType,
    marginUsdt: String(row.marginUsdt),
    leverage: String(row.leverage),
    leverageX100: row.leverageX100,
    notionalUsdt: normalizeNullableDecimal(row.notionalUsdt),
    slippagePercent: normalizeNullableDecimal(row.slippagePercent),
    entryPrice: normalizeNullableDecimal(row.entryPrice),
    currentPrice: null,
    exitPrice: normalizeNullableDecimal(row.exitPrice),
    pnlUsdt: normalizeNullableDecimal(row.pnlUsdt),
    pnlPercent: normalizeNullableDecimal(row.pnlPercent),
    unrealizedPnlUsdt: null,
    unrealizedPnlPercent: null,
    pnlSource: row.pnlUsdt != null ? "realized" : "none",
    strategyId: row.strategyId,
    strategyName: row.strategyName,
    agentId: row.agentId,
    agentName: row.agentName,
    signalId: row.signalId,
    source: row.source,
    createdAt: toTime(row.createTime),
    updatedAt: toTime(row.updateTime),
  };
}

async function fetchLatestPrices(symbols: string[]): Promise<Map<string, number>> {
  const uniqueSymbols = Array.from(
    new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)),
  );

  const pairs = await Promise.all(
    uniqueSymbols.map(async (symbol) => {
      try {
        const ticker = await MarketService.getTicker24h({ symbol });
        return [symbol, ticker.lastPrice] as const;
      } catch {
        return [symbol, null] as const;
      }
    }),
  );

  const prices = new Map<string, number>();
  for (const [symbol, price] of pairs) {
    if (price != null && Number.isFinite(price) && price > 0) {
      prices.set(symbol, price);
    }
  }
  return prices;
}

function estimateOrderPnl(
  order: ChainOrderRecord,
  latestPrices: Map<string, number>,
): ChainOrderRecord {
  if (order.pnlUsdt != null) {
    return {
      ...order,
      pnlSource: "realized",
      currentPrice: order.exitPrice ?? order.entryPrice,
    };
  }

  const currentPrice = latestPrices.get(order.symbol);
  const entryPrice = order.entryPrice == null ? null : Number(order.entryPrice);
  const margin = Number(order.marginUsdt);
  const leverage = Number(order.leverage);
  const notional = Number(order.notionalUsdt ?? margin * leverage);

  if (
    !currentPrice ||
    !entryPrice ||
    entryPrice <= 0 ||
    !Number.isFinite(margin) ||
    margin <= 0 ||
    !Number.isFinite(notional) ||
    notional <= 0 ||
    order.txStatus === "failed" ||
    order.txStatus === "cancelled"
  ) {
    return {
      ...order,
      currentPrice: currentPrice ? formatDecimal(currentPrice, 10) : null,
      pnlSource: "none",
    };
  }

  const rawMove = (currentPrice - entryPrice) / entryPrice;
  const directionalMove = order.side === "long" ? rawMove : -rawMove;
  const pnlUsdt = directionalMove * notional;
  const pnlPercent = (pnlUsdt / margin) * 100;

  return {
    ...order,
    currentPrice: formatDecimal(currentPrice, 10),
    unrealizedPnlUsdt: formatDecimal(pnlUsdt),
    unrealizedPnlPercent: formatDecimal(pnlPercent),
    pnlSource: "market_estimate",
  };
}

async function attachMarketEstimates(rows: ChainOrder[]): Promise<ChainOrderRecord[]> {
  const records = rows.map(mapRow);
  const latestPrices = await fetchLatestPrices(records.map((order) => order.symbol));
  return records.map((order) => estimateOrderPnl(order, latestPrices));
}

function generateOrderId(): string {
  return `co_${randomUUID().replace(/-/g, "")}`;
}

async function resolveEntryPrice(
  input: UpsertChainOrderBody,
  existing?: ChainOrder | null,
): Promise<string | null> {
  if (input.entryPrice != null) {
    return String(input.entryPrice);
  }
  if (existing?.entryPrice != null) {
    return String(existing.entryPrice);
  }

  try {
    const ticker = await MarketService.getTicker24h({ symbol: input.symbol });
    return String(ticker.lastPrice);
  } catch {
    return null;
  }
}

async function buildOrderValues(
  userId: number,
  input: UpsertChainOrderBody,
  existing?: ChainOrder | null,
) {
  const txStatus = deriveStatus(input.txStatus, input.receiptStatus);
  const orderId = input.orderId || generateOrderId();
  const margin = Number(input.marginUsdt);
  const leverage = Number(input.leverage);
  const entryPrice = await resolveEntryPrice(input, existing);
  const notional =
    input.notionalUsdt != null
      ? String(input.notionalUsdt)
      : Number.isFinite(margin) && Number.isFinite(leverage)
        ? String(margin * leverage)
        : null;

  return {
    orderId,
    userId,
    walletAddress: input.walletAddress.toLowerCase(),
    chain: input.chain,
    chainId: input.chainId,
    protocol: input.protocol,
    contractAddress: input.contractAddress?.toLowerCase() ?? null,
    txHash: input.txHash.toLowerCase(),
    txStatus,
    receiptStatus: input.receiptStatus ?? null,
    blockNumber: input.blockNumber ?? null,
    symbol: input.symbol,
    pairLabel: input.pairLabel,
    marketType: input.marketType,
    side: input.side,
    orderType: input.orderType,
    marginUsdt: input.marginUsdt,
    leverage: input.leverage,
    leverageX100: input.leverageX100 ?? Math.round(leverage * 100),
    notionalUsdt: notional,
    slippagePercent: input.slippagePercent ?? null,
    entryPrice,
    strategyId: input.strategyId ?? null,
    strategyName: input.strategyName ?? null,
    agentId: input.agentId ?? null,
    agentName: input.agentName ?? null,
    signalId: input.signalId ?? null,
    source: input.source,
    rawOrderJson: input.rawOrder ?? null,
    rawReceiptJson: input.rawReceipt ?? null,
  };
}

export class ChainOrderService {
  static async upsertFromChainTx(userId: number, input: UpsertChainOrderBody) {
    assertDbReady();

    const existing = await ChainOrder.findOne({
      where: { txHash: input.txHash.toLowerCase(), userId },
    });
    const values = await buildOrderValues(userId, input, existing);

    if (existing) {
      await existing.update({
        ...values,
        orderId: existing.orderId,
      });
      await existing.reload();
      const [estimated] = await attachMarketEstimates([existing]);
      return estimated;
    }

    const created = await ChainOrder.create(values);
    const [estimated] = await attachMarketEstimates([created]);
    return estimated;
  }

  static async listForUser(userId: number, query: ListChainOrdersQuery) {
    assertDbReady();

    const where: Record<string, unknown> = { userId };
    if (query.beforeId) where.id = { [Op.lt]: query.beforeId };
    if (query.status) where.txStatus = query.status;
    if (query.chain) where.chain = query.chain;
    if (query.symbol) where.symbol = query.symbol;
    if (query.strategyId) where.strategyId = query.strategyId;

    const rows = await ChainOrder.findAll({
      where,
      order: [["id", "DESC"]],
      limit: query.limit,
    });

    const orders = await attachMarketEstimates(rows);
    return {
      orders,
      nextCursor: rows.length === query.limit ? rows[rows.length - 1]?.id ?? null : null,
    };
  }

  static async getForUser(userId: number, orderId: string) {
    assertDbReady();

    const row = await ChainOrder.findOne({ where: { userId, orderId } });
    if (!row) {
      throw new NotFoundError("链上订单不存在");
    }

    const [estimated] = await attachMarketEstimates([row]);
    return estimated;
  }

  static async performanceSummary(userId: number): Promise<ChainOrderPerformanceItem[]> {
    assertDbReady();

    const rows = await ChainOrder.findAll({
      where: { userId },
      order: [["id", "DESC"]],
      limit: 1000,
    });
    const orders = await attachMarketEstimates(rows);

    const groups = new Map<
      string,
      {
        strategyId: string;
        strategyName: string;
        totalOrders: number;
        confirmedOrders: number;
        closedOrders: number;
        failedOrders: number;
        totalPnl: number;
        realizedPnl: number;
        unrealizedPnl: number;
        pnlPercentSum: number;
        pnlPercentCount: number;
        winCount: number;
        pnlCount: number;
      }
    >();

    for (const order of orders) {
      const strategyId = order.strategyId || "manual";
      const strategyName = order.strategyName || "手动下单";
      const current =
        groups.get(strategyId) ??
        {
          strategyId,
          strategyName,
          totalOrders: 0,
          confirmedOrders: 0,
          closedOrders: 0,
          failedOrders: 0,
          totalPnl: 0,
          realizedPnl: 0,
          unrealizedPnl: 0,
          pnlPercentSum: 0,
          pnlPercentCount: 0,
          winCount: 0,
          pnlCount: 0,
        };

      current.totalOrders += 1;
      if (order.txStatus === "confirmed") current.confirmedOrders += 1;
      if (order.txStatus === "closed") current.closedOrders += 1;
      if (order.txStatus === "failed") current.failedOrders += 1;

      const realizedPnl = order.pnlUsdt == null ? null : Number(order.pnlUsdt);
      if (realizedPnl != null && Number.isFinite(realizedPnl)) {
        current.realizedPnl += realizedPnl;
      }

      const unrealizedPnl =
        order.unrealizedPnlUsdt == null ? null : Number(order.unrealizedPnlUsdt);
      if (unrealizedPnl != null && Number.isFinite(unrealizedPnl)) {
        current.unrealizedPnl += unrealizedPnl;
      }

      const pnl =
        realizedPnl != null && Number.isFinite(realizedPnl)
          ? realizedPnl
          : unrealizedPnl != null && Number.isFinite(unrealizedPnl)
            ? unrealizedPnl
            : null;
      if (pnl != null && Number.isFinite(pnl)) {
        current.totalPnl += pnl;
        current.pnlCount += 1;
        if (pnl > 0) current.winCount += 1;
      }

      const pnlPercent =
        order.pnlPercent == null
          ? order.unrealizedPnlPercent == null
            ? null
            : Number(order.unrealizedPnlPercent)
          : Number(order.pnlPercent);
      if (pnlPercent != null && Number.isFinite(pnlPercent)) {
        current.pnlPercentSum += pnlPercent;
        current.pnlPercentCount += 1;
      }

      groups.set(strategyId, current);
    }

    return Array.from(groups.values()).map((item) => ({
      strategyId: item.strategyId,
      strategyName: item.strategyName,
      totalOrders: item.totalOrders,
      confirmedOrders: item.confirmedOrders,
      closedOrders: item.closedOrders,
      failedOrders: item.failedOrders,
      totalPnlUsdt: item.totalPnl.toFixed(6),
      realizedPnlUsdt: item.realizedPnl.toFixed(6),
      unrealizedPnlUsdt: item.unrealizedPnl.toFixed(6),
      avgPnlPercent:
        item.pnlPercentCount > 0
          ? (item.pnlPercentSum / item.pnlPercentCount).toFixed(6)
          : null,
      winRate:
        item.pnlCount > 0
          ? (item.winCount / item.pnlCount).toFixed(6)
          : null,
    }));
  }
}
