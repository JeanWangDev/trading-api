import { randomUUID } from "crypto";
import { OFFICIAL_STARTER_TEMPLATE_ID, OFFICIAL_TEMPLATE_USER_ID } from "@/constants/chart-template";
import { Op } from "sequelize";
import { ChartTemplate } from "@/db/models/chart-template";
import { BadRequestError, NotFoundError, UnauthorizedError } from "@/errors/app-error";
import { TradingSymbolService } from "@/services/market/trading-symbol.service";
import type { ChartTemplateRecord, TemplateVisibility } from "@/types/chart-template";
import { VISIBILITY_PRIVATE, VISIBILITY_PUBLIC } from "@/types/chart-template";

const ACTIVE = 1;

function toTimestamp(value: Date | null | undefined): number {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.getTime();
  }
  return Date.now();
}

function mapVisibility(value: number): TemplateVisibility {
  return value === VISIBILITY_PUBLIC ? "public" : "private";
}

function visibilityToDb(value: TemplateVisibility): number {
  return value === "public" ? VISIBILITY_PUBLIC : VISIBILITY_PRIVATE;
}

function mapRow(row: ChartTemplate): ChartTemplateRecord {
  const indicatorIds = Array.isArray(row.indicatorIds)
    ? (row.indicatorIds as string[]).map(String)
    : [];

  return {
    id: row.templateId,
    name: row.name,
    symbolId: row.symbolId ?? null,
    symbol: row.symbol ?? "",
    indicatorIds,
    visibility: mapVisibility(row.visibility),
    isDefault: row.isDefault === 1,
    isOfficial: row.userId === OFFICIAL_TEMPLATE_USER_ID,
    createdAt: toTimestamp(row.createTime),
    updatedAt: toTimestamp(row.updateTime),
  };
}

function normalizeIndicatorIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of ids) {
    const id = raw.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result.slice(0, 32);
}

type SymbolRefInput = {
  symbolId?: number | null;
  symbol?: string;
};

async function resolveSymbolRef(input: SymbolRefInput): Promise<{
  symbolId: number | null;
  symbol: string;
}> {
  const symbolId = input.symbolId ?? null;
  if (symbolId != null && symbolId > 0) {
    const pair = await TradingSymbolService.findActiveById(symbolId);
    if (!pair) {
      throw new BadRequestError("无效的交易对 ID");
    }
    return { symbolId: pair.id, symbol: pair.symbol };
  }

  const symbol = (input.symbol ?? "").trim().toUpperCase();
  if (!symbol) {
    return { symbolId: null, symbol: "" };
  }

  const pair = await TradingSymbolService.findActiveBySymbol(symbol);
  if (!pair) {
    throw new BadRequestError(`未知交易对：${symbol}`);
  }

  return { symbolId: pair.id, symbol: pair.symbol };
}

function symbolGroupKey(row: Pick<ChartTemplate, "symbolId" | "symbol">): string {
  if (row.symbolId != null && row.symbolId > 0) {
    return `id:${row.symbolId}`;
  }
  return `sym:${(row.symbol ?? "").trim().toUpperCase()}`;
}

async function resolveSymbolFilter(symbol?: string): Promise<string | null> {
  const raw = symbol?.trim().toUpperCase();
  if (!raw) return null;

  const pair = await TradingSymbolService.findActiveBySymbol(raw);
  return pair?.symbol ?? raw;
}

function buildSymbolWhere(symbol: string) {
  return { symbol };
}

/** 列表筛选：当前币对 + 不限币对（symbol 为空）+ symbolId 命中 */
async function buildSymbolListFilter(
  symbol?: string,
): Promise<Record<string, unknown> | null> {
  const normalized = await resolveSymbolFilter(symbol);
  if (!normalized) return null;

  const pair = await TradingSymbolService.findActiveBySymbol(normalized);
  const orConditions: Array<Record<string, unknown>> = [
    { symbol: "" },
    { symbol: normalized },
  ];
  if (pair) {
    orConditions.push({ symbolId: pair.id });
  }
  return { [Op.or]: orConditions };
}

async function clearDefaultForUserSymbol(
  userId: number,
  symbol: string,
  exceptTemplateId?: string,
) {
  const where: Record<string, unknown> = {
    userId,
    status: ACTIVE,
    isDefault: 1,
    visibility: VISIBILITY_PRIVATE,
    ...buildSymbolWhere(symbol),
  };

  if (exceptTemplateId) {
    where.templateId = { [Op.ne]: exceptTemplateId };
  }

  await ChartTemplate.update({ isDefault: 0 }, { where });
}

/** 每个币对最多保留一条默认私有模版 */
async function normalizeUserDefaults(userId: number): Promise<void> {
  const rows = await ChartTemplate.findAll({
    where: { userId, status: ACTIVE, isDefault: 1, visibility: VISIBILITY_PRIVATE },
    order: [["updateTime", "DESC"]],
  });

  const keptPerSymbol = new Set<string>();

  for (const row of rows) {
    const key = symbolGroupKey(row);
    if (keptPerSymbol.has(key)) {
      await row.update({ isDefault: 0 });
    } else {
      keptPerSymbol.add(key);
    }
  }
}

export type CreateChartTemplateInput = {
  name: string;
  symbolId?: number | null;
  symbol?: string;
  indicatorIds: string[];
  visibility?: TemplateVisibility;
  isDefault?: boolean;
};

export type UpdateChartTemplateInput = {
  name?: string;
  symbolId?: number | null;
  symbol?: string;
  indicatorIds?: string[];
  visibility?: TemplateVisibility;
};

export class ChartTemplateService {
  static async listPublic(symbol?: string): Promise<ChartTemplateRecord[]> {
    const symbolFilter = await buildSymbolListFilter(symbol);
    const where: Record<string, unknown> = {
      status: ACTIVE,
      visibility: VISIBILITY_PUBLIC,
    };
    if (symbolFilter) {
      Object.assign(where, symbolFilter);
    }

    const rows = await ChartTemplate.findAll({
      where,
      order: [
        ["userId", "ASC"],
        ["updateTime", "DESC"],
      ],
    });
    return rows.map(mapRow);
  }

  static async getStarterTemplate(): Promise<ChartTemplateRecord | null> {
    const row = await ChartTemplate.findOne({
      where: {
        templateId: OFFICIAL_STARTER_TEMPLATE_ID,
        userId: OFFICIAL_TEMPLATE_USER_ID,
        status: ACTIVE,
        visibility: VISIBILITY_PUBLIC,
      },
    });

    if (row) {
      return mapRow(row);
    }

    const fallback = await ChartTemplate.findOne({
      where: {
        userId: OFFICIAL_TEMPLATE_USER_ID,
        status: ACTIVE,
        visibility: VISIBILITY_PUBLIC,
      },
      order: [["id", "ASC"]],
    });

    return fallback ? mapRow(fallback) : null;
  }

  static async listMine(userId: number, symbol?: string): Promise<ChartTemplateRecord[]> {
    await normalizeUserDefaults(userId);

    const symbolFilter = await buildSymbolListFilter(symbol);
    const where: Record<string, unknown> = { userId, status: ACTIVE };
    if (symbolFilter) {
      Object.assign(where, symbolFilter);
    }

    const rows = await ChartTemplate.findAll({
      where,
      order: [
        ["isDefault", "DESC"],
        ["updateTime", "DESC"],
      ],
    });

    return rows.map(mapRow);
  }

  static async getDefaultForUser(
    userId: number,
    symbol: string,
  ): Promise<ChartTemplateRecord | null> {
    await normalizeUserDefaults(userId);

    const normalized = await resolveSymbolFilter(symbol);
    if (!normalized) {
      return null;
    }

    const pair = await TradingSymbolService.findActiveBySymbol(normalized);
    const pairConditions: Array<Record<string, unknown>> = [{ symbol: normalized }];
    if (pair) {
      pairConditions.push({ symbolId: pair.id });
    }

    const pairDefault = await ChartTemplate.findOne({
      where: {
        userId,
        status: ACTIVE,
        isDefault: 1,
        visibility: VISIBILITY_PRIVATE,
        [Op.or]: pairConditions,
      },
      order: [["updateTime", "DESC"]],
    });
    if (pairDefault) {
      return mapRow(pairDefault);
    }

    const universalDefault = await ChartTemplate.findOne({
      where: {
        userId,
        status: ACTIVE,
        isDefault: 1,
        visibility: VISIBILITY_PRIVATE,
        symbol: "",
      },
      order: [["updateTime", "DESC"]],
    });
    return universalDefault ? mapRow(universalDefault) : null;
  }

  static async getAccessible(
    templateId: string,
    userId?: number | null,
  ): Promise<ChartTemplateRecord> {
    const row = await ChartTemplate.findOne({
      where: { templateId, status: ACTIVE },
    });

    if (!row) {
      throw new NotFoundError("模版不存在");
    }

    if (row.visibility === VISIBILITY_PUBLIC) {
      return mapRow(row);
    }

    if (!userId || row.userId !== userId) {
      throw new UnauthorizedError("无权查看该模版");
    }

    return mapRow(row);
  }

  static async create(
    userId: number,
    input: CreateChartTemplateInput,
  ): Promise<ChartTemplateRecord> {
    const indicatorIds = normalizeIndicatorIds(input.indicatorIds);
    if (indicatorIds.length === 0) {
      throw new BadRequestError("至少选择一个指标");
    }

    const visibility = input.visibility ?? "private";
    const isDefault = visibility === "private" && input.isDefault === true;
    const symbolRef = await resolveSymbolRef(input);
    const now = new Date();

    if (isDefault) {
      await clearDefaultForUserSymbol(userId, symbolRef.symbol);
    }

    const row = await ChartTemplate.create({
      templateId: randomUUID(),
      userId,
      name: input.name.trim(),
      symbol: symbolRef.symbol,
      symbolId: symbolRef.symbolId,
      indicatorIds,
      visibility: visibilityToDb(visibility),
      isDefault: isDefault ? 1 : 0,
      status: ACTIVE,
      createTime: now,
      updateTime: now,
    });

    return mapRow(row);
  }

  static async update(
    userId: number,
    templateId: string,
    input: UpdateChartTemplateInput,
  ): Promise<ChartTemplateRecord> {
    const row = await ChartTemplate.findOne({
      where: { templateId, status: ACTIVE },
    });

    if (!row) {
      throw new NotFoundError("模版不存在");
    }

    if (row.userId !== userId) {
      throw new UnauthorizedError("无权修改该模版");
    }

    if (row.userId === OFFICIAL_TEMPLATE_USER_ID) {
      throw new BadRequestError("官方模版不可修改");
    }

    if (input.name !== undefined) {
      row.name = input.name.trim();
    }
    if (input.symbolId !== undefined || input.symbol !== undefined) {
      const symbolRef = await resolveSymbolRef({
        symbolId: input.symbolId,
        symbol: input.symbol,
      });
      row.symbolId = symbolRef.symbolId;
      row.symbol = symbolRef.symbol;
    }
    if (input.indicatorIds !== undefined) {
      const indicatorIds = normalizeIndicatorIds(input.indicatorIds);
      if (indicatorIds.length === 0) {
        throw new BadRequestError("至少选择一个指标");
      }
      row.indicatorIds = indicatorIds;
    }
    if (input.visibility !== undefined) {
      row.visibility = visibilityToDb(input.visibility);
      if (input.visibility === "public" && row.isDefault === 1) {
        row.isDefault = 0;
      }
    }

    await row.save();
    await row.reload();
    return mapRow(row);
  }

  static async setDefault(userId: number, templateId: string): Promise<ChartTemplateRecord> {
    const row = await ChartTemplate.findOne({
      where: { templateId, status: ACTIVE },
    });

    if (!row) {
      throw new NotFoundError("模版不存在");
    }

    if (row.userId !== userId) {
      throw new UnauthorizedError("无权修改该模版");
    }

    if (row.userId === OFFICIAL_TEMPLATE_USER_ID) {
      throw new BadRequestError("官方模版不可修改");
    }

    if (row.visibility === VISIBILITY_PUBLIC) {
      throw new BadRequestError("公开模版不能设为默认，请先改为私有");
    }

    await clearDefaultForUserSymbol(userId, row.symbol, templateId);
    row.isDefault = 1;
    await row.save();
    await row.reload();
    await normalizeUserDefaults(userId);
    return mapRow(row);
  }

  static async remove(userId: number, templateId: string): Promise<void> {
    const row = await ChartTemplate.findOne({
      where: { templateId, status: ACTIVE },
    });

    if (!row) {
      throw new NotFoundError("模版不存在");
    }

    if (row.userId !== userId) {
      throw new UnauthorizedError("无权删除该模版");
    }

    if (row.userId === OFFICIAL_TEMPLATE_USER_ID) {
      throw new BadRequestError("官方模版不可删除");
    }

    await row.update({ status: 0, isDefault: 0 });
  }
}
