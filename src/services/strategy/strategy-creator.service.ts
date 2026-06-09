import { MembershipPlan, Strategy } from "@/db";
import { DEFAULT_PLATFORM_FEE_RATE } from "@/constants/strategy";
import { BadRequestError, NotFoundError, UnauthorizedError } from "@/errors/app-error";
import { config } from "@/config";
import { ChartTemplateService } from "@/services/chart-template/chart-template.service";
import { TradingSymbolService } from "@/services/market/trading-symbol.service";
import {
  STRATEGY_VISIBILITY_PUBLIC,
  buildStrategyPlanKey,
  strategyVisibilityToDb,
  type StrategyVisibility,
} from "@/types/strategy";

function assertDbReady() {
  if (!config.db.enabled) {
    throw new BadRequestError("数据库未启用");
  }
}

function normalizeTags(tags: string[]): string {
  return tags
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 8)
    .join(",");
}

async function resolveSymbol(symbol: string): Promise<string> {
  const normalized = symbol.trim().toUpperCase();
  const pair = await TradingSymbolService.findActiveBySymbol(normalized);
  if (!pair) {
    throw new BadRequestError(`未知交易对：${normalized}`);
  }
  return pair.symbol;
}

async function ensureTemplateAccess(templateId: string | null | undefined, userId: number) {
  if (!templateId) return;
  await ChartTemplateService.getAccessible(templateId, userId);
}

async function syncMembershipPlan(
  strategy: Strategy,
  followFeeUsdt: number,
  durationDays: number,
) {
  const planKey = strategy.planKey;
  const existing = await MembershipPlan.findOne({ where: { planKey } });

  const payload = {
    name: `${strategy.name} · 跟单`,
    description: strategy.summary || strategy.description.slice(0, 255),
    priceUsdt: followFeeUsdt.toFixed(6),
    durationDays,
    targetRoleKey: "normal_user",
    sortOrder: 100,
    status: 1,
  };

  if (existing) {
    await existing.update(payload);
    return existing;
  }

  return MembershipPlan.create({
    planKey,
    ...payload,
    chain: "TRC20",
    asset: "USDT",
  });
}

export type CreateStrategyInput = {
  strategyKey: string;
  name: string;
  summary?: string;
  description: string;
  symbol: string;
  interval: string;
  templateId?: string | null;
  tags?: string[];
  followFeeUsdt?: number;
  durationDays?: number;
  visibility?: StrategyVisibility;
};

export type UpdateStrategyInput = {
  name?: string;
  summary?: string;
  description?: string;
  symbol?: string;
  interval?: string;
  templateId?: string | null;
  tags?: string[];
  followFeeUsdt?: number;
  durationDays?: number;
  visibility?: StrategyVisibility;
};

export class StrategyCreatorService {
  static async create(userId: number, input: CreateStrategyInput) {
    assertDbReady();

    const existing = await Strategy.findOne({ where: { strategyKey: input.strategyKey } });
    if (existing) {
      throw new BadRequestError("策略标识已被占用");
    }

    await ensureTemplateAccess(input.templateId, userId);

    const symbol = await resolveSymbol(input.symbol);
    const visibility = strategyVisibilityToDb(input.visibility ?? "draft");
    const followFeeUsdt = input.followFeeUsdt ?? 0;
    const durationDays = input.durationDays ?? 30;
    const planKey = buildStrategyPlanKey(input.strategyKey);

    const row = await Strategy.create({
      userId,
      strategyKey: input.strategyKey,
      planKey,
      name: input.name.trim(),
      summary: (input.summary ?? "").trim(),
      description: input.description.trim(),
      symbol,
      interval: input.interval.trim(),
      templateId: input.templateId ?? null,
      tags: normalizeTags(input.tags ?? []),
      sortOrder: 100,
      status: 1,
      visibility,
      followFeeUsdt: followFeeUsdt.toFixed(6),
      platformFeeRate: String(DEFAULT_PLATFORM_FEE_RATE),
      sourceStrategyKey: null,
      followerCount: 0,
    });

    if (visibility === STRATEGY_VISIBILITY_PUBLIC && followFeeUsdt > 0) {
      await syncMembershipPlan(row, followFeeUsdt, durationDays);
    }

    return row;
  }

  static async update(userId: number, strategyKey: string, input: UpdateStrategyInput) {
    assertDbReady();

    const row = await Strategy.findOne({ where: { strategyKey, status: 1 } });
    if (!row) {
      throw new NotFoundError("策略不存在");
    }
    if (row.userId !== userId) {
      throw new UnauthorizedError("无权修改该策略");
    }

    if (input.templateId !== undefined) {
      await ensureTemplateAccess(input.templateId, userId);
    }

    const updates: Partial<Strategy> = {};

    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.summary !== undefined) updates.summary = input.summary.trim();
    if (input.description !== undefined) updates.description = input.description.trim();
    if (input.symbol !== undefined) updates.symbol = await resolveSymbol(input.symbol);
    if (input.interval !== undefined) updates.interval = input.interval.trim();
    if (input.templateId !== undefined) updates.templateId = input.templateId;
    if (input.tags !== undefined) updates.tags = normalizeTags(input.tags);
    if (input.followFeeUsdt !== undefined) {
      updates.followFeeUsdt = input.followFeeUsdt.toFixed(6);
    }
    if (input.visibility !== undefined) {
      updates.visibility = strategyVisibilityToDb(input.visibility);
    }

    await row.update(updates);

    const visibility = input.visibility
      ? strategyVisibilityToDb(input.visibility)
      : row.visibility;
    const fee = Number(input.followFeeUsdt ?? row.followFeeUsdt);
    const durationDays = input.durationDays ?? 30;

    if (visibility === STRATEGY_VISIBILITY_PUBLIC && fee > 0) {
      await syncMembershipPlan(row, fee, durationDays);
    }

    await row.reload();
    return row;
  }

  static async listPublished(userId: number) {
    assertDbReady();

    return Strategy.findAll({
      where: { userId, status: 1 },
      order: [
        ["updateTime", "DESC"],
        ["id", "DESC"],
      ],
    });
  }
}
