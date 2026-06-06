import { Op } from "sequelize";
import { config } from "@/config";
import { TradingSymbol } from "@/db/models/market";
import { BadRequestError, NotFoundError } from "@/errors/app-error";

export type AccessTier = 0 | 1;

export type TradingPairRecord = {
  id: number;
  baseAsset: string;
  symbol: string;
  exchange: string;
  displayName: string;
  sortOrder: number;
  isDefault: boolean;
  accessTier: AccessTier;
  status: number;
};

export type TradingPairPublicRecord = TradingPairRecord & {
  locked: boolean;
};

const ACTIVE = 1;
const ACCESS_FREE: AccessTier = 0;
const ACCESS_VIP: AccessTier = 1;

const FALLBACK_PAIRS: TradingPairRecord[] = [
  {
    id: 1,
    baseAsset: "BTC",
    symbol: "BTCUSDT",
    exchange: "binance",
    displayName: "Bitcoin",
    sortOrder: 10,
    isDefault: true,
    accessTier: ACCESS_FREE,
    status: ACTIVE,
  },
  {
    id: 2,
    baseAsset: "ETH",
    symbol: "ETHUSDT",
    exchange: "binance",
    displayName: "Ethereum",
    sortOrder: 20,
    isDefault: false,
    accessTier: ACCESS_FREE,
    status: ACTIVE,
  },
  {
    id: 3,
    baseAsset: "SOL",
    symbol: "SOLUSDT",
    exchange: "binance",
    displayName: "Solana",
    sortOrder: 30,
    isDefault: false,
    accessTier: ACCESS_FREE,
    status: ACTIVE,
  },
  {
    id: 4,
    baseAsset: "BNB",
    symbol: "BNBUSDT",
    exchange: "binance",
    displayName: "BNB",
    sortOrder: 40,
    isDefault: false,
    accessTier: ACCESS_VIP,
    status: ACTIVE,
  },
  {
    id: 5,
    baseAsset: "XRP",
    symbol: "XRPUSDT",
    exchange: "binance",
    displayName: "XRP",
    sortOrder: 50,
    isDefault: false,
    accessTier: ACCESS_VIP,
    status: ACTIVE,
  },
];

function mapRow(row: TradingSymbol): TradingPairRecord {
  return {
    id: row.id,
    baseAsset: row.baseAsset,
    symbol: row.symbol,
    exchange: row.exchange,
    displayName: row.displayName || row.baseAsset,
    sortOrder: row.sortOrder,
    isDefault: row.isDefault === 1,
    accessTier: row.accessTier === ACCESS_VIP ? ACCESS_VIP : ACCESS_FREE,
    status: row.status,
  };
}

function canAccessVipPairs(roleKey?: string, roleLevel?: number): boolean {
  if (roleKey === "admin" || roleKey === "super_admin") return true;
  return typeof roleLevel === "number" && roleLevel >= 2;
}

function withLocked(
  record: TradingPairRecord,
  roleKey?: string,
  roleLevel?: number,
): TradingPairPublicRecord {
  const locked =
    record.accessTier === ACCESS_VIP && !canAccessVipPairs(roleKey, roleLevel);
  return { ...record, locked };
}

export type CreateTradingSymbolInput = {
  baseAsset: string;
  symbol: string;
  exchange?: string;
  displayName?: string;
  sortOrder?: number;
  isDefault?: boolean;
  accessTier?: AccessTier;
  status?: 0 | 1;
};

export type UpdateTradingSymbolInput = {
  baseAsset?: string;
  symbol?: string;
  exchange?: string;
  displayName?: string;
  sortOrder?: number;
  isDefault?: boolean;
  accessTier?: AccessTier;
  status?: 0 | 1;
};

export class TradingSymbolService {
  static async listActivePublic(options?: {
    roleKey?: string;
    roleLevel?: number;
  }): Promise<TradingPairPublicRecord[]> {
    const rows = await TradingSymbolService.listActive();
    return rows.map((row) => withLocked(row, options?.roleKey, options?.roleLevel));
  }

  static async listActive(): Promise<TradingPairRecord[]> {
    if (!config.db.enabled) {
      return FALLBACK_PAIRS.filter((p) => p.status === ACTIVE);
    }

    const rows = await TradingSymbol.findAll({
      where: { status: ACTIVE },
      order: [
        ["sortOrder", "ASC"],
        ["id", "ASC"],
      ],
    });

    return rows.map(mapRow);
  }

  static async listAllAdmin(): Promise<TradingPairRecord[]> {
    if (!config.db.enabled) {
      return [...FALLBACK_PAIRS];
    }

    const rows = await TradingSymbol.findAll({
      order: [
        ["sortOrder", "ASC"],
        ["id", "ASC"],
      ],
    });

    return rows.map(mapRow);
  }

  static async getDefaultPair(): Promise<TradingPairRecord> {
    if (!config.db.enabled) {
      return FALLBACK_PAIRS.find((p) => p.isDefault) ?? FALLBACK_PAIRS[0];
    }

    const preferred = await TradingSymbol.findOne({
      where: { status: ACTIVE, isDefault: 1 },
      order: [["sortOrder", "ASC"]],
    });

    if (preferred) {
      return mapRow(preferred);
    }

    const first = await TradingSymbol.findOne({
      where: { status: ACTIVE },
      order: [["sortOrder", "ASC"]],
    });

    if (!first) {
      return FALLBACK_PAIRS[0];
    }

    return mapRow(first);
  }

  static async isKnownBaseAsset(baseAsset: string): Promise<boolean> {
    const base = baseAsset.trim().toUpperCase();
    if (!config.db.enabled) {
      return FALLBACK_PAIRS.some((p) => p.baseAsset === base && p.status === ACTIVE);
    }

    const count = await TradingSymbol.count({
      where: { status: ACTIVE, baseAsset: base },
    });
    return count > 0;
  }

  static async findActiveById(id: number): Promise<TradingPairRecord | null> {
    if (!config.db.enabled) {
      const pair = FALLBACK_PAIRS.find((p) => p.id === id && p.status === ACTIVE);
      return pair ?? null;
    }

    const row = await TradingSymbol.findOne({
      where: { id, status: ACTIVE },
    });
    return row ? mapRow(row) : null;
  }

  static async findActiveBySymbol(symbol: string): Promise<TradingPairRecord | null> {
    const normalized = symbol.trim().toUpperCase();
    if (!normalized) return null;

    if (!config.db.enabled) {
      return FALLBACK_PAIRS.find((p) => p.symbol === normalized && p.status === ACTIVE) ?? null;
    }

    const row = await TradingSymbol.findOne({
      where: { symbol: normalized, status: ACTIVE },
      order: [["sortOrder", "ASC"]],
    });
    return row ? mapRow(row) : null;
  }

  static async findById(id: number): Promise<TradingPairRecord | null> {
    if (!config.db.enabled) {
      return FALLBACK_PAIRS.find((p) => p.id === id) ?? null;
    }

    const row = await TradingSymbol.findByPk(id);
    return row ? mapRow(row) : null;
  }

  static async create(input: CreateTradingSymbolInput): Promise<TradingPairRecord> {
    if (!config.db.enabled) {
      throw new BadRequestError("数据库未启用，无法创建交易对");
    }

    const exchange = (input.exchange ?? "binance").trim().toLowerCase();
    const symbol = input.symbol.trim().toUpperCase();
    const baseAsset = input.baseAsset.trim().toUpperCase();

    const existing = await TradingSymbol.findOne({
      where: { exchange, symbol },
    });
    if (existing) {
      throw new BadRequestError("该交易所下交易对已存在");
    }

    if (input.isDefault) {
      await TradingSymbol.update({ isDefault: 0 }, { where: {} });
    }

    const now = new Date();
    const row = await TradingSymbol.create({
      baseAsset,
      symbol,
      exchange,
      displayName: (input.displayName ?? "").trim() || baseAsset,
      sortOrder: input.sortOrder ?? 0,
      isDefault: input.isDefault ? 1 : 0,
      accessTier: input.accessTier ?? ACCESS_FREE,
      status: input.status ?? ACTIVE,
      createTime: now,
      updateTime: now,
    });

    return mapRow(row);
  }

  static async update(id: number, input: UpdateTradingSymbolInput): Promise<TradingPairRecord> {
    if (!config.db.enabled) {
      throw new BadRequestError("数据库未启用，无法更新交易对");
    }

    const row = await TradingSymbol.findByPk(id);
    if (!row) {
      throw new NotFoundError("交易对不存在");
    }

    if (input.symbol !== undefined || input.exchange !== undefined) {
      const exchange = (input.exchange ?? row.exchange).trim().toLowerCase();
      const symbol = (input.symbol ?? row.symbol).trim().toUpperCase();
      const duplicate = await TradingSymbol.findOne({
        where: { exchange, symbol },
      });
      if (duplicate && duplicate.id !== id) {
        throw new BadRequestError("该交易所下交易对已存在");
      }
    }

    const updates: Partial<{
      baseAsset: string;
      symbol: string;
      exchange: string;
      displayName: string;
      sortOrder: number;
      isDefault: number;
      accessTier: number;
      status: number;
      updateTime: Date;
    }> = { updateTime: new Date() };

    if (input.baseAsset !== undefined) updates.baseAsset = input.baseAsset.trim().toUpperCase();
    if (input.symbol !== undefined) updates.symbol = input.symbol.trim().toUpperCase();
    if (input.exchange !== undefined) updates.exchange = input.exchange.trim().toLowerCase();
    if (input.displayName !== undefined) {
      updates.displayName = input.displayName.trim();
    }
    if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;
    if (input.accessTier !== undefined) updates.accessTier = input.accessTier;
    if (input.status !== undefined) updates.status = input.status;

    if (input.isDefault === true) {
      await TradingSymbol.update({ isDefault: 0 }, { where: { id: { [Op.ne]: id } } });
      updates.isDefault = 1;
    } else if (input.isDefault === false) {
      updates.isDefault = 0;
    }

    await row.update(updates);
    await row.reload();
    return mapRow(row);
  }

  static async remove(id: number): Promise<void> {
    if (!config.db.enabled) {
      throw new BadRequestError("数据库未启用，无法删除交易对");
    }

    const row = await TradingSymbol.findByPk(id);
    if (!row) {
      throw new NotFoundError("交易对不存在");
    }

    await row.update({
      status: 0,
      isDefault: 0,
      updateTime: new Date(),
    });
  }
}
