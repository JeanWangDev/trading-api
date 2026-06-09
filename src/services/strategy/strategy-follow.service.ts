import { Op } from "sequelize";
import { MembershipPlan, Strategy, StrategyFollow, User, UserSubscription } from "@/db";
import { BadRequestError } from "@/errors/app-error";
import { config } from "@/config";
import { isStrategyPlanKey } from "@/constants/strategy";
import { CreatorPayoutService } from "@/services/creator/creator-payout.service";
import type { PaymentOrder } from "@/db";

function assertDbReady() {
  if (!config.db.enabled) {
    throw new BadRequestError("数据库未启用");
  }
}

function calcFeeSplit(totalUsdt: string, platformFeeRate: string) {
  const total = Number(totalUsdt);
  const rate = Number(platformFeeRate);
  if (!Number.isFinite(total) || total <= 0) {
    return { feeUsdt: "0", platformFeeUsdt: "0", creatorFeeUsdt: "0" };
  }
  const platform = (total * rate) / 100;
  const creator = total - platform;
  return {
    feeUsdt: total.toFixed(6),
    platformFeeUsdt: platform.toFixed(6),
    creatorFeeUsdt: creator.toFixed(6),
  };
}

export class StrategyFollowService {
  static async recordFromOrder(
    order: PaymentOrder,
    subscription: UserSubscription,
    plan: MembershipPlan,
  ) {
    assertDbReady();

    if (!isStrategyPlanKey(plan.planKey)) {
      return;
    }

    const strategy = await Strategy.findOne({ where: { planKey: plan.planKey, status: 1 } });
    if (!strategy || strategy.userId <= 0) {
      return;
    }

    if (order.userId === strategy.userId) {
      return;
    }

    const fees = calcFeeSplit(
      order.paidAmountUsdt ?? plan.priceUsdt,
      strategy.platformFeeRate,
    );

    const existing = await StrategyFollow.findOne({
      where: {
        strategyKey: strategy.strategyKey,
        followerUserId: order.userId,
      },
    });

    let followRow = existing;

    if (existing) {
      await existing.update({
        subscriptionId: subscription.id,
        orderId: order.id,
        status: 1,
        ...fees,
      });
    } else {
      followRow = await StrategyFollow.create({
        strategyId: strategy.id,
        strategyKey: strategy.strategyKey,
        followerUserId: order.userId,
        subscriptionId: subscription.id,
        orderId: order.id,
        status: 1,
        ...fees,
      });
      await strategy.update({ followerCount: strategy.followerCount + 1 });
    }

    if (followRow && Number(fees.creatorFeeUsdt) > 0) {
      await CreatorPayoutService.creditFollowFee({
        creatorUserId: strategy.userId,
        amountUsdt: fees.creatorFeeUsdt,
        followId: followRow.id,
        note: `策略 ${strategy.strategyKey} 跟单分成`,
      });
    }
  }

  static async listFollowing(userId: number) {
    assertDbReady();

    const now = new Date();
    const subs = await UserSubscription.findAll({
      where: {
        userId,
        status: "active",
        endsAt: { [Op.gt]: now },
        planKey: { [Op.like]: "strategy_%" },
      },
      order: [["endsAt", "DESC"]],
    });

    if (subs.length === 0) {
      return [];
    }

    const planKeys = subs.map((s) => s.planKey);
    const strategies = await Strategy.findAll({
      where: { planKey: { [Op.in]: planKeys }, status: 1 },
    });

    const subByPlan = new Map(subs.map((s) => [s.planKey, s]));

    return strategies.map((row) => {
      const sub = subByPlan.get(row.planKey);
      return {
        row,
        plan: null as MembershipPlan | null,
        access: {
          subscribed: true,
          endsAt: sub?.endsAt.getTime() ?? null,
        },
      };
    });
  }

  static async getCreatorMap(userIds: number[]) {
    const ids = [...new Set(userIds.filter((id) => id > 0))];
    if (ids.length === 0) {
      return new Map<number, { nickname: string }>();
    }

    const users = await User.findAll({
      where: { id: ids },
      attributes: ["id", "nickname"],
    });

    return new Map(users.map((u) => [Number(u.id), { nickname: u.nickname }]));
  }
}
