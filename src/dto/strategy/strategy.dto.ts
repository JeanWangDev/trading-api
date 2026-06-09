import type { MembershipPlan } from "@/db";
import type { Strategy } from "@/db/models/strategy";
import { PLATFORM_STRATEGY_USER_ID, strategyVisibilityFromDb } from "@/types/strategy";

export type StrategyStatsDto = {
  totalReturnPct: string;
  maxDrawdownPct: string;
  sharpeRatio: string;
  winRate: string;
  tradeCount: number;
  equityUsdt: string;
};

export function toStrategyDto(
  row: Strategy,
  plan: MembershipPlan | null,
  access?: { subscribed: boolean; endsAt: number | null },
  creator?: { nickname: string } | null,
  stats?: StrategyStatsDto | null,
) {
  const isOfficial = row.userId === PLATFORM_STRATEGY_USER_ID;

  return {
    strategyKey: row.strategyKey,
    planKey: row.planKey,
    name: row.name,
    summary: row.summary,
    description: row.description,
    symbol: row.symbol,
    interval: row.interval,
    templateId: row.templateId,
    tags: row.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    priceUsdt: plan ? String(plan.priceUsdt) : String(row.followFeeUsdt),
    durationDays: plan?.durationDays ?? 30,
    asset: plan?.asset ?? "USDT",
    chain: plan?.chain ?? "TRC20",
    subscribed: access?.subscribed ?? false,
    subscriptionEndsAt: access?.endsAt ?? null,
    creatorUserId: isOfficial ? null : Number(row.userId),
    creatorNickname: isOfficial ? "Polaris" : creator?.nickname ?? null,
    followerCount: row.followerCount,
    followFeeUsdt: String(row.followFeeUsdt),
    platformFeeRate: String(row.platformFeeRate),
    visibility: strategyVisibilityFromDb(row.visibility),
    isOfficial,
    isOwner: false,
    stats: stats ?? null,
  };
}

export function toOwnedStrategyDto(
  row: Strategy,
  plan: MembershipPlan | null,
  access: { subscribed: boolean; endsAt: number | null },
  creatorNickname: string,
) {
  return {
    ...toStrategyDto(row, plan, access, { nickname: creatorNickname }),
    isOwner: true,
  };
}
