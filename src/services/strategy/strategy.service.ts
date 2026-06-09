import { Op } from "sequelize";
import { MembershipPlan, Strategy, StrategyPaperState, UserSubscription } from "@/db";
import { BadRequestError, NotFoundError, UnauthorizedError } from "@/errors/app-error";
import { config } from "@/config";
import { MarketBriefService } from "@/services/market";
import { PaperTradingService } from "@/services/strategy/paper-trading.service";
import { StrategyCreatorService } from "@/services/strategy/strategy-creator.service";
import { StrategyFollowService } from "@/services/strategy/strategy-follow.service";
import { STRATEGY_VISIBILITY_PUBLIC } from "@/types/strategy";
import type { CanonicalInterval } from "@/types/market";

function assertDbReady() {
  if (!config.db.enabled) {
    throw new BadRequestError("数据库未启用");
  }
}

async function getPlanForStrategy(strategy: Strategy) {
  return MembershipPlan.findOne({
    where: { planKey: strategy.planKey, status: 1 },
  });
}

async function getSubscriptionAccess(userId: number | null, planKey: string) {
  if (!userId) {
    return { subscribed: false, endsAt: null as number | null };
  }

  const now = new Date();
  const row = await UserSubscription.findOne({
    where: {
      userId,
      planKey,
      status: "active",
      endsAt: { [Op.gt]: now },
    },
    order: [["endsAt", "DESC"]],
  });

  if (!row) {
    return { subscribed: false, endsAt: null };
  }

  return { subscribed: true, endsAt: row.endsAt.getTime() };
}

export class StrategyCatalogService {
  static async listActive(userId: number | null) {
    assertDbReady();

    const rows = await Strategy.findAll({
      where: { status: 1, visibility: STRATEGY_VISIBILITY_PUBLIC },
      order: [
        ["followerCount", "DESC"],
        ["sortOrder", "ASC"],
        ["id", "ASC"],
      ],
    });

    const creatorMap = await StrategyFollowService.getCreatorMap(rows.map((r) => r.userId));
    const paperStates = await StrategyPaperState.findAll({
      where: { strategyKey: rows.map((r) => r.strategyKey) },
    });
    const statsMap = new Map(paperStates.map((s) => [s.strategyKey, s]));
    const strategies = [];

    for (const row of rows) {
      const plan = await getPlanForStrategy(row);
      const access = await getSubscriptionAccess(userId, row.planKey);
      const creator = creatorMap.get(row.userId) ?? null;
      const paper = statsMap.get(row.strategyKey);
      const stats = paper
        ? {
            totalReturnPct: String(paper.totalReturnPct),
            maxDrawdownPct: String(paper.maxDrawdownPct),
            sharpeRatio: String(paper.sharpeRatio),
            winRate: String(paper.winRate),
            tradeCount: paper.tradeCount,
            equityUsdt: String(paper.equityUsdt),
          }
        : null;
      strategies.push({ row, plan, access, creator, stats });
    }

    return strategies;
  }

  static async getByKey(strategyKey: string, userId: number | null) {
    assertDbReady();

    const row = await Strategy.findOne({
      where: { strategyKey, status: 1 },
    });

    if (!row) {
      throw new NotFoundError("策略不存在或已下架");
    }

    if (row.visibility !== STRATEGY_VISIBILITY_PUBLIC) {
      if (!userId || row.userId !== userId) {
        throw new UnauthorizedError("无权查看该策略");
      }
    }

    const plan = await getPlanForStrategy(row);
    const access = await getSubscriptionAccess(userId, row.planKey);
    const creatorMap = await StrategyFollowService.getCreatorMap([row.userId]);
    const creator = creatorMap.get(row.userId) ?? null;

    const stats = await PaperTradingService.getStats(strategyKey);

    return {
      row,
      plan,
      access,
      creator,
      stats: {
        totalReturnPct: stats.totalReturnPct,
        maxDrawdownPct: stats.maxDrawdownPct,
        sharpeRatio: stats.sharpeRatio,
        winRate: stats.winRate,
        tradeCount: stats.tradeCount,
        equityUsdt: stats.equityUsdt,
      },
    };
  }

  static async getStats(strategyKey: string) {
    assertDbReady();
    return PaperTradingService.getStats(strategyKey);
  }

  static async listMine(userId: number, scope: "published" | "following" = "following") {
    assertDbReady();

    if (scope === "published") {
      const rows = await StrategyCreatorService.listPublished(userId);
      const strategies = [];
      for (const row of rows) {
        const plan = await getPlanForStrategy(row);
        const access = await getSubscriptionAccess(userId, row.planKey);
        strategies.push({
          row,
          plan,
          access,
          creator: { nickname: "" },
        });
      }
      return strategies;
    }

    const following = await StrategyFollowService.listFollowing(userId);
    const creatorMap = await StrategyFollowService.getCreatorMap(
      following.map((item) => item.row.userId),
    );

    return following.map((item) => ({
      ...item,
      creator: creatorMap.get(item.row.userId) ?? null,
    }));
  }

  static async getSignal(strategyKey: string, userId: number) {
    assertDbReady();

    const { row, access } = await StrategyCatalogService.getByKey(strategyKey, userId);

    if (!access.subscribed) {
      throw new BadRequestError("请先跟单该策略");
    }

    const brief = await MarketBriefService.getBrief({
      symbol: row.symbol,
      interval: row.interval as CanonicalInterval,
    });

    return {
      strategyKey: row.strategyKey,
      symbol: row.symbol,
      interval: row.interval,
      brief,
      subscriptionEndsAt: access.endsAt,
    };
  }
}
