import { randomUUID } from "crypto";
import { keccak256 } from "js-sha3";
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
  PreflightChainOrderBody,
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

const MOCK_PERP_POSITION_OPENED_TOPIC = "0x" + keccak256(
  "PositionOpened(uint256,address,bytes32,uint8,uint256,uint256,uint256,uint256,uint256)",
);
const MOCK_PERP_POSITION_CLOSED_TOPIC = "0x" + keccak256(
  "PositionClosed(uint256,address,bytes32,uint256)",
);

type EvmLog = {
  address?: string;
  topics?: unknown;
  data?: string;
  logIndex?: string;
  [key: string]: unknown;
};

type ParsedMockPerpOpenedEvent = {
  eventName: "PositionOpened";
  positionId: string;
  user: string;
  symbol: string;
  side: ChainOrderSide;
  marginUsdt: string;
  leverage: string;
  leverageX100: number;
  entryPrice: string;
  stopLossPrice: string | null;
  takeProfitPrice: string | null;
  logIndex?: string;
};

type ParsedMockPerpClosedEvent = {
  eventName: "PositionClosed";
  positionId: string;
  user: string;
  symbol: string;
  exitPrice: string;
  logIndex?: string;
};

type ParsedMockPerpEvent = ParsedMockPerpOpenedEvent | ParsedMockPerpClosedEvent;

type MockPerpReceiptContext = {
  contractAddress?: string | null;
  walletAddress?: string | null;
  symbol?: string | null;
  side?: string | null;
  marginUsdt?: string | null;
  leverage?: string | null;
  existingEntryPrice?: string | null;
};

type ChainOrderDbPatch = Partial<{
  txStatus: ChainOrderStatus;
  receiptStatus: string | null;
  blockNumber: string | null;
  symbol: string;
  side: ChainOrderSide;
  marginUsdt: string;
  leverage: string;
  leverageX100: number;
  notionalUsdt: string | null;
  entryPrice: string | null;
  exitPrice: string | null;
  pnlUsdt: string | null;
  pnlPercent: string | null;
  rawReceiptJson: unknown;
}>;

function normalizeAddress(value: string | null | undefined): string | null {
  if (!value || !/^0x[a-fA-F0-9]{40}$/.test(value)) return null;
  return value.toLowerCase();
}

function normalizeHex(value: unknown): string | null {
  if (typeof value !== "string" || !/^0x[a-fA-F0-9]*$/.test(value)) return null;
  return value.toLowerCase();
}

function hexToBigInt(value: unknown): bigint | null {
  const hex = normalizeHex(value);
  if (!hex || hex === "0x") return null;
  return BigInt(hex);
}

function asTopicList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const topics = value.map(normalizeHex);
  if (topics.some((topic) => topic == null)) return null;
  return topics as string[];
}

function dataWords(data: unknown): string[] {
  const hex = normalizeHex(data);
  if (!hex) return [];
  const body = hex.slice(2);
  if (body.length === 0 || body.length % 64 !== 0) return [];
  const words: string[] = [];
  for (let index = 0; index < body.length; index += 64) {
    words.push("0x" + body.slice(index, index + 64));
  }
  return words;
}

function topicToAddress(topic: string | undefined): string | null {
  if (!topic || !/^0x[a-f0-9]{64}$/.test(topic)) return null;
  return "0x" + topic.slice(-40);
}

function bytes32ToText(topic: string | undefined): string | null {
  if (!topic || !/^0x[a-f0-9]{64}$/.test(topic)) return null;
  const buffer = Buffer.from(topic.slice(2), "hex");
  const end = buffer.indexOf(0);
  const sliced = end >= 0 ? buffer.subarray(0, end) : buffer;
  const textValue = sliced.toString("utf8").trim();
  return textValue ? textValue.toUpperCase() : null;
}

function formatUnits(value: bigint, decimals: number, maxFractionDigits = decimals): string {
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  let fraction = (value % base).toString().padStart(decimals, "0");
  fraction = fraction.slice(0, maxFractionDigits).replace(/0+$/, "");
  return fraction ? whole.toString() + "." + fraction : whole.toString();
}

function parsePositionOpenedLog(log: EvmLog): ParsedMockPerpOpenedEvent | null {
  const topics = asTopicList(log.topics);
  const words = dataWords(log.data);
  if (!topics || topics.length < 4 || words.length < 6) return null;

  const positionId = hexToBigInt(topics[1]);
  const user = topicToAddress(topics[2]);
  const symbol = bytes32ToText(topics[3]);
  const sideCode = hexToBigInt(words[0]);
  const marginUsdc = hexToBigInt(words[1]);
  const leverageX100Raw = hexToBigInt(words[2]);
  const entryPriceE8 = hexToBigInt(words[3]);
  const stopLossPriceE8 = hexToBigInt(words[4]);
  const takeProfitPriceE8 = hexToBigInt(words[5]);

  if (
    positionId == null ||
    !user ||
    !symbol ||
    sideCode == null ||
    marginUsdc == null ||
    leverageX100Raw == null ||
    entryPriceE8 == null ||
    leverageX100Raw > BigInt(Number.MAX_SAFE_INTEGER)
  ) {
    return null;
  }

  const side = sideCode === 1n ? "long" : sideCode === 2n ? "short" : null;
  if (!side) return null;

  return {
    eventName: "PositionOpened",
    positionId: positionId.toString(),
    user,
    symbol,
    side,
    marginUsdt: formatUnits(marginUsdc, 6, 10),
    leverage: formatUnits(leverageX100Raw, 2, 6),
    leverageX100: Number(leverageX100Raw),
    entryPrice: formatUnits(entryPriceE8, 8, 10),
    stopLossPrice: stopLossPriceE8 && stopLossPriceE8 > 0n ? formatUnits(stopLossPriceE8, 8, 10) : null,
    takeProfitPrice:
      takeProfitPriceE8 && takeProfitPriceE8 > 0n ? formatUnits(takeProfitPriceE8, 8, 10) : null,
    logIndex: log.logIndex,
  };
}

function parsePositionClosedLog(log: EvmLog): ParsedMockPerpClosedEvent | null {
  const topics = asTopicList(log.topics);
  const words = dataWords(log.data);
  if (!topics || topics.length < 4 || words.length < 1) return null;

  const positionId = hexToBigInt(topics[1]);
  const user = topicToAddress(topics[2]);
  const symbol = bytes32ToText(topics[3]);
  const exitPriceE8 = hexToBigInt(words[0]);
  if (positionId == null || !user || !symbol || exitPriceE8 == null) return null;

  return {
    eventName: "PositionClosed",
    positionId: positionId.toString(),
    user,
    symbol,
    exitPrice: formatUnits(exitPriceE8, 8, 10),
    logIndex: log.logIndex,
  };
}

function normalizeReceipt(value: unknown): EvmTransactionReceipt | null {
  if (!value || typeof value !== "object") return null;
  return value as EvmTransactionReceipt;
}

function parseMockPerpEvents(
  receipt: EvmTransactionReceipt,
  contractAddress?: string | null,
): ParsedMockPerpEvent[] {
  const logs = Array.isArray(receipt.logs) ? receipt.logs : [];
  const expectedAddress = normalizeAddress(contractAddress ?? null);
  const events: ParsedMockPerpEvent[] = [];

  for (const log of logs) {
    const topics = asTopicList(log.topics);
    if (!topics || topics.length === 0) continue;

    const logAddress = normalizeAddress(log.address);
    if (expectedAddress && logAddress && logAddress !== expectedAddress) continue;

    if (topics[0] === MOCK_PERP_POSITION_OPENED_TOPIC) {
      const parsed = parsePositionOpenedLog(log);
      if (parsed) events.push(parsed);
    } else if (topics[0] === MOCK_PERP_POSITION_CLOSED_TOPIC) {
      const parsed = parsePositionClosedLog(log);
      if (parsed) events.push(parsed);
    }
  }

  return events;
}

function eventMatchesContext(event: ParsedMockPerpEvent, context: MockPerpReceiptContext): boolean {
  const wallet = normalizeAddress(context.walletAddress ?? null);
  if (wallet && event.user !== wallet) return false;

  const symbol = context.symbol?.trim().toUpperCase();
  if (symbol && event.symbol !== symbol) return false;

  return true;
}

function withParsedMockPerpEvents(
  receipt: EvmTransactionReceipt,
  events: ParsedMockPerpEvent[],
): EvmTransactionReceipt {
  return events.length > 0 ? { ...receipt, parsedMockPerpEvents: events } : receipt;
}

function computeNotionalUsdt(marginUsdt: string, leverage: string): string | null {
  const margin = Number(marginUsdt);
  const leverageValue = Number(leverage);
  if (!Number.isFinite(margin) || !Number.isFinite(leverageValue)) return null;
  return formatDecimal(margin * leverageValue, 10);
}

function computeRealizedPnlPatch(options: {
  side: string | null | undefined;
  entryPrice: string | null | undefined;
  exitPrice: string;
  marginUsdt: string | null | undefined;
  leverage: string | null | undefined;
}): Pick<ChainOrderDbPatch, "pnlUsdt" | "pnlPercent"> {
  const entry = Number(options.entryPrice);
  const exit = Number(options.exitPrice);
  const margin = Number(options.marginUsdt);
  const leverageValue = Number(options.leverage);
  const notional = margin * leverageValue;

  if (
    !Number.isFinite(entry) ||
    entry <= 0 ||
    !Number.isFinite(exit) ||
    exit <= 0 ||
    !Number.isFinite(margin) ||
    margin <= 0 ||
    !Number.isFinite(notional) ||
    notional <= 0
  ) {
    return {};
  }

  const rawMove = (exit - entry) / entry;
  const directionalMove = options.side === "short" ? -rawMove : rawMove;
  const pnlUsdt = directionalMove * notional;
  const pnlPercent = (pnlUsdt / margin) * 100;

  return {
    pnlUsdt: formatDecimal(pnlUsdt, 10),
    pnlPercent: formatDecimal(pnlPercent, 8),
  };
}

function buildMockPerpReceiptPatch(
  receiptLike: unknown,
  context: MockPerpReceiptContext,
): ChainOrderDbPatch {
  const receipt = normalizeReceipt(receiptLike);
  if (!receipt) return {};

  const receiptStatus =
    typeof receipt.status === "string" ? receipt.status.toLowerCase() : null;
  const blockNumber = typeof receipt.blockNumber === "string" ? receipt.blockNumber : null;
  const events = parseMockPerpEvents(receipt, context.contractAddress);
  const opened = events.find(
    (event): event is ParsedMockPerpOpenedEvent =>
      event.eventName === "PositionOpened" && eventMatchesContext(event, context),
  );
  const closed = events.find(
    (event): event is ParsedMockPerpClosedEvent =>
      event.eventName === "PositionClosed" && eventMatchesContext(event, context),
  );

  const patch: ChainOrderDbPatch = {
    rawReceiptJson: withParsedMockPerpEvents(receipt, events),
  };

  if (receiptStatus) {
    patch.receiptStatus = receiptStatus;
    patch.txStatus = deriveStatus(undefined, receiptStatus);
  }
  if (blockNumber) patch.blockNumber = blockNumber;

  if (receiptStatus === "0x0") return patch;

  if (opened) {
    patch.txStatus = "confirmed";
    patch.symbol = opened.symbol;
    patch.side = opened.side;
    patch.marginUsdt = opened.marginUsdt;
    patch.leverage = opened.leverage;
    patch.leverageX100 = opened.leverageX100;
    patch.notionalUsdt = computeNotionalUsdt(opened.marginUsdt, opened.leverage);
    patch.entryPrice = opened.entryPrice;
  }

  if (closed) {
    const entryPrice = patch.entryPrice ?? context.existingEntryPrice;
    const side = patch.side ?? context.side;
    const marginUsdt = patch.marginUsdt ?? context.marginUsdt;
    const leverage = patch.leverage ?? context.leverage;

    patch.txStatus = "closed";
    patch.exitPrice = closed.exitPrice;
    Object.assign(
      patch,
      computeRealizedPnlPatch({
        side,
        entryPrice,
        exitPrice: closed.exitPrice,
        marginUsdt,
        leverage,
      }),
    );
  }

  return patch;
}

function deriveStatus(
  txStatus?: ChainOrderStatus,
  receiptStatus?: string | null,
): ChainOrderStatus {
  if (txStatus) return txStatus;
  const normalizedReceiptStatus = receiptStatus?.toLowerCase();
  if (normalizedReceiptStatus === "0x1") return "confirmed";
  if (normalizedReceiptStatus === "0x0") return "failed";
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

  const values = {
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

  return {
    ...values,
    ...buildMockPerpReceiptPatch(input.rawReceipt, {
      contractAddress: values.contractAddress,
      walletAddress: values.walletAddress,
      symbol: values.symbol,
      side: values.side,
      marginUsdt: values.marginUsdt,
      leverage: values.leverage,
      existingEntryPrice: values.entryPrice,
    }),
  };
}


type EvmTransactionReceipt = {
  transactionHash?: string;
  status?: string;
  blockNumber?: string;
  logs?: EvmLog[];
  parsedMockPerpEvents?: ParsedMockPerpEvent[];
  [key: string]: unknown;
};

export type ChainOrderReceiptSyncResult = {
  checked: number;
  confirmed: number;
  failed: number;
  pending: number;
  skipped: number;
  errors: number;
};

export type ChainOrderPreflightResult = {
  allowed: boolean;
  reasons: string[];
  warnings: string[];
  dailyUsed: number;
  dailyRemaining: number | null;
  limits: {
    riskEnabled: boolean;
    minMarginUsdt: number;
    maxMarginUsdt: number;
    minLeverage: number;
    maxLeverage: number;
    maxNotionalUsdt: number;
    maxSlippagePercent: number;
    dailyOrderLimit: number;
    allowedChains: string[];
    allowedProtocols: string[];
  };
};

function normalizeStringList(values: string[]): string[] {
  return values.map((value) => value.trim().toLowerCase()).filter(Boolean);
}

function chainOrderRiskLimits(): ChainOrderPreflightResult["limits"] {
  return {
    riskEnabled: config.chainOrders.riskEnabled,
    minMarginUsdt: config.chainOrders.minMarginUsdt,
    maxMarginUsdt: config.chainOrders.maxMarginUsdt,
    minLeverage: config.chainOrders.minLeverage,
    maxLeverage: config.chainOrders.maxLeverage,
    maxNotionalUsdt: config.chainOrders.maxNotionalUsdt,
    maxSlippagePercent: config.chainOrders.maxSlippagePercent,
    dailyOrderLimit: config.chainOrders.dailyOrderLimit,
    allowedChains: config.chainOrders.allowedChains,
    allowedProtocols: config.chainOrders.allowedProtocols,
  };
}

function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function riskNumber(value: string | number | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

async function evaluateChainOrderRisk(
  userId: number,
  input: PreflightChainOrderBody,
): Promise<ChainOrderPreflightResult> {
  const limits = chainOrderRiskLimits();
  const dailyUsed = await ChainOrder.count({
    where: {
      userId,
      createTime: { [Op.gte]: startOfToday() },
    },
  });
  const dailyRemaining =
    limits.dailyOrderLimit > 0 ? Math.max(limits.dailyOrderLimit - dailyUsed, 0) : null;
  const reasons: string[] = [];
  const warnings: string[] = [];

  if (!limits.riskEnabled) {
    warnings.push("链上订单风控当前未启用，仅返回参考额度");
    return { allowed: true, reasons, warnings, dailyUsed, dailyRemaining, limits };
  }

  const allowedChains = normalizeStringList(limits.allowedChains);
  const allowedProtocols = normalizeStringList(limits.allowedProtocols);
  const chain = input.chain.trim().toLowerCase();
  const protocol = input.protocol.trim().toLowerCase();

  if (allowedChains.length > 0 && !allowedChains.includes(chain)) {
    reasons.push("当前仅允许网络：" + limits.allowedChains.join(", "));
  }

  if (allowedProtocols.length > 0 && !allowedProtocols.includes(protocol)) {
    reasons.push("当前仅允许协议：" + limits.allowedProtocols.join(", "));
  }

  const margin = riskNumber(input.marginUsdt);
  const leverage = riskNumber(input.leverage);
  const notional = riskNumber(input.notionalUsdt ?? margin * leverage);
  const slippage = riskNumber(input.slippagePercent ?? 0);

  if (!Number.isFinite(margin) || margin <= 0) {
    reasons.push("保证金必须大于 0");
  } else {
    if (margin < limits.minMarginUsdt) {
      reasons.push("单笔保证金不能低于 " + limits.minMarginUsdt + " USDT");
    }
    if (margin > limits.maxMarginUsdt) {
      reasons.push("单笔保证金不能超过 " + limits.maxMarginUsdt + " USDT");
    }
  }

  if (!Number.isFinite(leverage) || leverage <= 0) {
    reasons.push("杠杆必须大于 0");
  } else {
    if (leverage < limits.minLeverage) {
      reasons.push("杠杆不能低于 " + limits.minLeverage + "x");
    }
    if (leverage > limits.maxLeverage) {
      reasons.push("测试环境杠杆不能超过 " + limits.maxLeverage + "x");
    }
  }

  if (!Number.isFinite(notional) || notional <= 0) {
    reasons.push("名义金额无效");
  } else if (notional > limits.maxNotionalUsdt) {
    reasons.push("名义金额不能超过 " + limits.maxNotionalUsdt + " USDT");
  }

  if (!Number.isFinite(slippage) || slippage < 0) {
    reasons.push("滑点必须大于等于 0");
  } else if (slippage > limits.maxSlippagePercent) {
    reasons.push("滑点不能超过 " + limits.maxSlippagePercent + "%");
  }

  if (limits.dailyOrderLimit > 0 && dailyUsed >= limits.dailyOrderLimit) {
    reasons.push("今日链上测试订单已达上限 " + limits.dailyOrderLimit + " 笔");
  }

  if (input.marketType === "spot") {
    warnings.push("现货交易仍在预留阶段，当前主要验证合约下单链路");
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    warnings,
    dailyUsed,
    dailyRemaining,
    limits,
  };
}

function rpcUrlForChain(row: ChainOrder): string | null {
  const chain = row.chain.toLowerCase();
  const chainId = row.chainId.toLowerCase();

  if (chain === "bsc-testnet" || chainId === "0x61" || chainId === "97") {
    return config.chainOrders.bscTestnetRpcUrl || null;
  }

  if (
    chain === "bsc" ||
    chain === "bsc-mainnet" ||
    chainId === "0x38" ||
    chainId === "56"
  ) {
    return config.chainOrders.bscRpcUrl || null;
  }

  return null;
}

async function fetchTransactionReceipt(
  rpcUrl: string,
  txHash: string,
  timeoutMs: number,
): Promise<EvmTransactionReceipt | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "eth_getTransactionReceipt",
        params: [txHash],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error("RPC request failed with HTTP " + response.status);
    }

    const payload = (await response.json()) as {
      result?: EvmTransactionReceipt | null;
      error?: { message?: string };
    };

    if (payload.error) {
      throw new Error(payload.error.message || "RPC returned an error");
    }

    return payload.result ?? null;
  } finally {
    clearTimeout(timer);
  }
}

export class ChainOrderService {
  static async preflight(userId: number, input: PreflightChainOrderBody) {
    assertDbReady();
    return evaluateChainOrderRisk(userId, input);
  }

  static async syncSubmittedReceipts(options: {
    limit?: number;
    timeoutMs?: number;
  } = {}): Promise<ChainOrderReceiptSyncResult> {
    assertDbReady();

    const limit = Math.max(
      1,
      Math.min(options.limit ?? config.chainOrders.watchBatchSize, 200),
    );
    const timeoutMs = options.timeoutMs ?? config.chainOrders.receiptRpcTimeoutMs;
    const rows = await ChainOrder.findAll({
      where: { txStatus: "submitted" },
      order: [["id", "ASC"]],
      limit,
    });

    const result: ChainOrderReceiptSyncResult = {
      checked: rows.length,
      confirmed: 0,
      failed: 0,
      pending: 0,
      skipped: 0,
      errors: 0,
    };

    for (const row of rows) {
      const rpcUrl = rpcUrlForChain(row);
      if (!rpcUrl) {
        result.skipped += 1;
        continue;
      }

      try {
        const receipt = await fetchTransactionReceipt(rpcUrl, row.txHash, timeoutMs);
        if (!receipt) {
          result.pending += 1;
          continue;
        }

        const receiptStatus =
          typeof receipt.status === "string" ? receipt.status.toLowerCase() : null;
        const blockNumber =
          typeof receipt.blockNumber === "string" ? receipt.blockNumber : row.blockNumber;
        const txStatus = deriveStatus(undefined, receiptStatus);

        const receiptPatch = buildMockPerpReceiptPatch(receipt, {
          contractAddress: row.contractAddress,
          walletAddress: row.walletAddress,
          symbol: row.symbol,
          side: row.side,
          marginUsdt: String(row.marginUsdt),
          leverage: String(row.leverage),
          existingEntryPrice: row.entryPrice == null ? null : String(row.entryPrice),
        });

        await row.update({
          txStatus,
          receiptStatus,
          blockNumber,
          rawReceiptJson: receipt,
          ...receiptPatch,
        });

        if (txStatus === "confirmed") {
          result.confirmed += 1;
        } else if (txStatus === "failed") {
          result.failed += 1;
        } else {
          result.pending += 1;
        }
      } catch (error) {
        result.errors += 1;
        console.warn("[chain-order-sync] receipt sync failed", {
          orderId: row.orderId,
          txHash: row.txHash,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return result;
  }

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
