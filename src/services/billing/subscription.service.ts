import { Op } from "sequelize";
import { MembershipPlan, PaymentOrder, UserSubscription } from "@/db";
import { BadRequestError } from "@/errors/app-error";
import { config } from "@/config";
import { MembershipRoleService } from "./membership-role.service";

function assertDbReady() {
  if (!config.db.enabled) {
    throw new BadRequestError("数据库未启用");
  }
}

function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

export class BillingSubscriptionService {
  static async getActiveForUser(userId: number) {
    assertDbReady();

    const now = new Date();
    const row = await UserSubscription.findOne({
      where: {
        userId,
        status: "active",
        endsAt: { [Op.gt]: now },
      },
      order: [["endsAt", "DESC"]],
      include: [{ model: MembershipPlan, as: "plan", required: false }],
    });

    if (!row) {
      return null;
    }

    return {
      planKey: row.planKey,
      planName: row.plan?.name ?? row.planKey,
      status: row.status,
      startsAt: row.startsAt.getTime(),
      endsAt: row.endsAt.getTime(),
    };
  }

  static async activateFromOrder(order: PaymentOrder): Promise<void> {
    assertDbReady();

    if (order.status === "paid") {
      return;
    }

    const plan = await MembershipPlan.findByPk(order.planId);
    if (!plan) {
      throw new BadRequestError("订单关联套餐不存在");
    }

    const now = new Date();
    const current = await UserSubscription.findOne({
      where: {
        userId: order.userId,
        status: "active",
        endsAt: { [Op.gt]: now },
      },
      order: [["endsAt", "DESC"]],
    });

    const startsAt =
      current && current.endsAt > now ? new Date(current.endsAt) : now;
    const endsAt = addDays(startsAt, plan.durationDays);

    await UserSubscription.create({
      userId: order.userId,
      planId: plan.id,
      planKey: plan.planKey,
      orderId: order.id,
      status: "active",
      startsAt,
      endsAt,
    });

    await MembershipRoleService.upgradeUserRole(order.userId, plan.targetRoleKey);
  }

  static async expireDueSubscriptions(): Promise<number> {
    assertDbReady();

    const now = new Date();
    const dueRows = await UserSubscription.findAll({
      where: {
        status: "active",
        endsAt: { [Op.lte]: now },
      },
    });

    if (dueRows.length === 0) {
      return 0;
    }

    for (const row of dueRows) {
      await row.update({ status: "expired" });
    }

    const userIds = [...new Set(dueRows.map((row) => row.userId))];

    for (const userId of userIds) {
      const stillActive = await UserSubscription.findOne({
        where: {
          userId,
          status: "active",
          endsAt: { [Op.gt]: now },
        },
      });

      if (!stillActive) {
        await MembershipRoleService.downgradeToNormalIfNeeded(userId);
      }
    }

    return dueRows.length;
  }
}
