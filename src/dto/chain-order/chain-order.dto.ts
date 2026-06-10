import type {
  ChainOrderPerformanceItem,
  ChainOrderRecord,
} from "@/types/chain-order";

export function toChainOrderDto(order: ChainOrderRecord) {
  return {
    id: order.id,
    orderId: order.orderId,
    walletAddress: order.walletAddress,
    chain: order.chain,
    chainId: order.chainId,
    protocol: order.protocol,
    contractAddress: order.contractAddress,
    txHash: order.txHash,
    txStatus: order.txStatus,
    receiptStatus: order.receiptStatus,
    blockNumber: order.blockNumber,
    symbol: order.symbol,
    pairLabel: order.pairLabel,
    marketType: order.marketType,
    side: order.side,
    orderType: order.orderType,
    marginUsdt: order.marginUsdt,
    leverage: order.leverage,
    leverageX100: order.leverageX100,
    notionalUsdt: order.notionalUsdt,
    slippagePercent: order.slippagePercent,
    entryPrice: order.entryPrice,
    currentPrice: order.currentPrice,
    exitPrice: order.exitPrice,
    pnlUsdt: order.pnlUsdt,
    pnlPercent: order.pnlPercent,
    unrealizedPnlUsdt: order.unrealizedPnlUsdt,
    unrealizedPnlPercent: order.unrealizedPnlPercent,
    pnlSource: order.pnlSource,
    strategyId: order.strategyId,
    strategyName: order.strategyName,
    agentId: order.agentId,
    agentName: order.agentName,
    signalId: order.signalId,
    source: order.source,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export function toChainOrderPerformanceDto(item: ChainOrderPerformanceItem) {
  return {
    strategyId: item.strategyId,
    strategyName: item.strategyName,
    totalOrders: item.totalOrders,
    confirmedOrders: item.confirmedOrders,
    closedOrders: item.closedOrders,
    failedOrders: item.failedOrders,
    totalPnlUsdt: item.totalPnlUsdt,
    realizedPnlUsdt: item.realizedPnlUsdt,
    unrealizedPnlUsdt: item.unrealizedPnlUsdt,
    avgPnlPercent: item.avgPnlPercent,
    winRate: item.winRate,
  };
}
