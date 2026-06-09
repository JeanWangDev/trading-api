import { randomUUID } from "crypto";
import { Op } from "sequelize";
import { ChainOrder } from "@/db";
import { BadRequestError, NotFoundError } from "@/errors/app-error";
import { config } from "@/config";
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
    exitPrice: normalizeNullableDecimal(row.exitPrice),
    pnlUsdt: normalizeNullableDecimal(row.pnlUsdt),
    pnlPercent: normalizeNullableDecimal(row.pnlPercent),
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

function generateOrderId(): string {
  return `co_${randomUUID().replace(/-/g, "")}`;
}

function buildOrderValues(userId: number, input: UpsertChainOrderBody) {
  const txStatus = deriveStatus(input.txStatus, input.receiptStatus);
  const orderId = input.orderId || generateOrderId();
  const margin = Number(input.marginUsdt);
  const leverage = Number(input.leverage);
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
    entryPrice: input.entryPrice ?? null,
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

    const values = buildOrderValues(userId, input);
    const existing = await ChainOrder.findOne({
      where: { txHash: values.txHash, userId },
    });

    if (existing) {
      await existing.update({
        ...values,
        orderId: existing.orderId,
      });
      await existing.reload();
      return mapRow(existing);
    }

    const created = await ChainOrder.create(values);
    return mapRow(created);
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

    const orders = rows.map(mapRow);
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

    return mapRow(row);
  }

  static async performanceSummary(userId: number): Promise<ChainOrderPerformanceItem[]> {
    assertDbReady();

    const rows = await ChainOrder.findAll({
      where: { userId },
      order: [["id", "DESC"]],
      limit: 1000,
    });

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
        pnlPercentSum: number;
        pnlPercentCount: number;
        winCount: number;
        closedWithPnlCount: number;
      }
    >();

    for (const row of rows) {
      const strategyId = row.strategyId || "manual";
      const strategyName = row.strategyName || "手动下单";
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
          pnlPercentSum: 0,
          pnlPercentCount: 0,
          winCount: 0,
          closedWithPnlCount: 0,
        };

      current.totalOrders += 1;
      if (row.txStatus === "confirmed") current.confirmedOrders += 1;
      if (row.txStatus === "closed") current.closedOrders += 1;
      if (row.txStatus === "failed") current.failedOrders += 1;

      const pnl = row.pnlUsdt == null ? null : Number(row.pnlUsdt);
      if (pnl != null && Number.isFinite(pnl)) {
        current.totalPnl += pnl;
        current.closedWithPnlCount += 1;
        if (pnl > 0) current.winCount += 1;
      }

      const pnlPercent = row.pnlPercent == null ? null : Number(row.pnlPercent);
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
      avgPnlPercent:
        item.pnlPercentCount > 0
          ? (item.pnlPercentSum / item.pnlPercentCount).toFixed(6)
          : null,
      winRate:
        item.closedWithPnlCount > 0
          ? (item.winCount / item.closedWithPnlCount).toFixed(6)
          : null,
    }));
  }
}
