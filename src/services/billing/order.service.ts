import { Op } from "sequelize";
import { getSequelize } from "@/db/connection";
import { PaymentAddressIndex, PaymentOrder } from "@/db";
import { deriveTronAddressFromXpub } from "@/billing/tron-address";
import { decimalUsdtToMicro, fetchTrc20IncomingTransfers, usdtMicroToDecimal } from "@/billing/tron-grid";
import { BadRequestError, NotFoundError } from "@/errors/app-error";
import { config } from "@/config";
import { BillingPlanService } from "./plan.service";
import { BillingSubscriptionService } from "./subscription.service";
import { BillingPaymentWebhookService } from "./payment-webhook.service";

function assertDbReady() {
  if (!config.db.enabled) {
    throw new BadRequestError("数据库未启用");
  }
}

function assertBillingEnabled() {
  if (!config.billing.enabled) {
    throw new BadRequestError("会员支付功能未启用");
  }
}

async function allocateDepositAddress(): Promise<{ address: string; index: number | null }> {
  const xpub = config.billing.tron.depositXpub.trim();
  if (xpub) {
    const sequelize = await getSequelize();
    if (!sequelize) {
      throw new BadRequestError("数据库未连接");
    }

    const index = await sequelize.transaction(async (transaction) => {
      let row = await PaymentAddressIndex.findByPk(1, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!row) {
        row = await PaymentAddressIndex.create({ id: 1, nextIndex: 0 }, { transaction });
      }

      const current = row.nextIndex;
      await row.update({ nextIndex: current + 1 }, { transaction });
      return current;
    });

    return {
      address: await deriveTronAddressFromXpub(xpub, index),
      index,
    };
  }

  const treasury = config.billing.tron.treasuryAddress.trim();
  if (treasury) {
    return { address: treasury, index: null };
  }

  if (config.isDev && config.billing.devAutoConfirm) {
    return { address: "TDevPolarisBilling0000000000001", index: null };
  }

  throw new BadRequestError(
    "收款地址未配置，请在 .env 设置 TRON_DEPOSIT_XPUB 或 TRON_TREASURY_ADDRESS",
  );
}

/** 固定收款地址时，用订单 id 生成唯一小数尾差，便于对账 */
function treasuryPayAmount(basePriceUsdt: string, orderId: number): string {
  const baseMicro = decimalUsdtToMicro(basePriceUsdt);
  const tag = BigInt(orderId % 10000);
  return usdtMicroToDecimal((baseMicro + tag).toString());
}

/** 站内订单号（非链上 tx、非 OKX 单号），仅用于本站查单与对账 */
function generateOrderNo(): string {
  const d = new Date();
  const pad = (n: number, len = 2) => n.toString().padStart(len, "0");
  const datePart = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const timePart = `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const randomPart = Math.floor(Math.random() * 1_000_000_000_000)
    .toString()
    .padStart(12, "0");
  return `${datePart}${timePart}${randomPart}`;
}

function isTreasuryDeposit(addressIndex: number | null, depositAddress: string): boolean {
  if (addressIndex !== null) return false;
  const treasury = config.billing.tron.treasuryAddress.trim();
  return Boolean(treasury && depositAddress === treasury);
}

function mapOrder(order: PaymentOrder) {
  const expired =
    order.status === "pending" && order.expireTime.getTime() <= Date.now();
  const paymentStatus =
    order.status === "paid"
      ? "completed"
      : order.status === "cancelled"
        ? "cancelled"
        : order.status === "expired" || expired
          ? "expired"
          : "pending";

  const plan = order.plan;

  return {
    orderNo: order.orderNo,
    planKey: order.planKey,
    planName: plan?.name ?? order.planKey,
    durationDays: plan?.durationDays ?? null,
    chain: order.chain,
    asset: order.asset,
    amountUsdt: String(order.amountUsdt),
    depositAddress: order.depositAddress,
    status: expired && order.status === "pending" ? "expired" : order.status,
    paymentStatus,
    txHash: order.txHash,
    paidAmountUsdt: order.paidAmountUsdt ? String(order.paidAmountUsdt) : null,
    expireAt: order.expireTime.getTime(),
    paidAt: order.paidTime ? order.paidTime.getTime() : null,
    createdAt: order.createTime.getTime(),
  };
}

const orderIncludePlan = [{ association: "plan" as const, required: false }];

export class BillingOrderService {
  static async createOrder(userId: number, planKey: string) {
    assertDbReady();
    assertBillingEnabled();

    const plan = await BillingPlanService.getActiveByKey(planKey);

    const pendingCount = await PaymentOrder.count({
      where: {
        userId,
        status: "pending",
        expireTime: { [Op.gt]: new Date() },
      },
    });

    if (pendingCount >= 3) {
      throw new BadRequestError("你有过多待支付订单，请先完成或等待过期");
    }

    const { address, index } = await allocateDepositAddress();
    const expireTime = new Date(Date.now() + config.billing.orderExpireMinutes * 60_000);

    const orderNo = generateOrderNo();

    const draft = await PaymentOrder.create({
      orderNo,
      userId,
      planId: plan.id,
      planKey: plan.planKey,
      chain: plan.chain,
      asset: plan.asset,
      amountUsdt: String(plan.priceUsdt),
      depositAddress: address,
      addressIndex: index,
      status: "pending",
      expireTime,
    });

    if (isTreasuryDeposit(index, address)) {
      const exactAmount = treasuryPayAmount(String(plan.priceUsdt), draft.id);
      await draft.update({ amountUsdt: exactAmount });
    }

    if (config.billing.devAutoConfirm) {
      setTimeout(() => {
        void BillingOrderService.confirmOrderPaid(draft.id, {
          txHash: `dev_auto_${draft.id}`,
          paidAmountUsdt: String(draft.amountUsdt),
        }).catch((error) => {
          console.error("[billing] dev auto confirm failed", error);
        });
      }, 3_000);
    }

    await draft.reload({ include: orderIncludePlan });
    return mapOrder(draft);
  }

  static async getOrderForUser(userId: number, orderNo: string) {
    assertDbReady();

    const order = await PaymentOrder.findOne({
      where: { orderNo, userId },
      include: orderIncludePlan,
    });

    if (!order) {
      throw new NotFoundError("订单不存在");
    }

    if (order.status === "pending" && order.expireTime <= new Date()) {
      await order.update({ status: "expired" });
      await order.reload({ include: orderIncludePlan });
    }

    return mapOrder(order);
  }

  static async listOrdersForUser(userId: number, limit = 10) {
    assertDbReady();

    const rows = await PaymentOrder.findAll({
      where: { userId },
      order: [["id", "DESC"]],
      limit: Math.min(50, Math.max(1, limit)),
    });

    return rows.map(mapOrder);
  }

  static async cancelOrder(userId: number, orderNo: string) {
    assertDbReady();

    const order = await PaymentOrder.findOne({
      where: { orderNo, userId },
      include: orderIncludePlan,
    });

    if (!order) {
      throw new NotFoundError("订单不存在");
    }

    if (order.status !== "pending") {
      throw new BadRequestError("仅待支付订单可取消");
    }

    if (order.expireTime <= new Date()) {
      await order.update({ status: "expired" });
      await order.reload({ include: orderIncludePlan });
      return mapOrder(order);
    }

    await order.update({ status: "cancelled" });
    await order.reload({ include: orderIncludePlan });
    return mapOrder(order);
  }

  static async expirePendingOrders(): Promise<number> {
    assertDbReady();

    const [count] = await PaymentOrder.update(
      { status: "expired" },
      {
        where: {
          status: "pending",
          expireTime: { [Op.lte]: new Date() },
        },
      },
    );

    return count;
  }

  static async confirmOrderPaid(
    orderId: number,
    input: { txHash: string; paidAmountUsdt: string },
  ): Promise<void> {
    assertDbReady();

    const order = await PaymentOrder.findByPk(orderId);
    if (!order || order.status !== "pending") {
      return;
    }

    if (order.expireTime <= new Date()) {
      await order.update({ status: "expired" });
      return;
    }

    await order.update({
      status: "paid",
      txHash: input.txHash,
      paidAmountUsdt: input.paidAmountUsdt,
      paidTime: new Date(),
    });

    await order.reload();
    await BillingPaymentWebhookService.notifyPaymentCompleted(order);

    if (config.billing.autoUpgradeVip) {
      await BillingSubscriptionService.activateFromOrder(order);
    } else {
      console.log(`[billing] order ${order.orderNo} paid — VIP auto-upgrade disabled`);
    }
  }

  static async scanPendingOrders(): Promise<{ checked: number; paid: number }> {
    assertDbReady();
    assertBillingEnabled();

    if (config.billing.devAutoConfirm) {
      return { checked: 0, paid: 0 };
    }

    const pending = await PaymentOrder.findAll({
      where: {
        status: "pending",
        expireTime: { [Op.gt]: new Date() },
      },
      order: [["id", "ASC"]],
      limit: 50,
    });

    let paid = 0;

    for (const order of pending) {
      try {
        const matched = await BillingOrderService.matchIncomingPayment(order);
        if (matched) {
          paid += 1;
        }
      } catch (error) {
        console.error(`[billing] scan order ${order.orderNo} failed`, error);
      }
    }

    return { checked: pending.length, paid };
  }

  private static async matchIncomingPayment(order: PaymentOrder): Promise<boolean> {
    const minTimestampMs = order.createTime.getTime() - 60_000;
    const transfers = await fetchTrc20IncomingTransfers(
      order.depositAddress,
      minTimestampMs,
    );

    const expectedMicro = decimalUsdtToMicro(String(order.amountUsdt));
    const treasuryMode = isTreasuryDeposit(order.addressIndex, order.depositAddress);

    for (const transfer of transfers) {
      const receivedMicro = decimalUsdtToMicro(transfer.amountUsdt);
      const amountOk = treasuryMode
        ? receivedMicro === expectedMicro
        : receivedMicro >= expectedMicro;
      if (!amountOk) {
        continue;
      }

      const existing = await PaymentOrder.findOne({
        where: { txHash: transfer.txHash, status: "paid" },
      });
      if (existing) {
        continue;
      }

      await BillingOrderService.confirmOrderPaid(order.id, {
        txHash: transfer.txHash,
        paidAmountUsdt: transfer.amountUsdt,
      });

      console.log(
        `[billing] order ${order.orderNo} paid tx=${transfer.txHash} amount=${transfer.amountUsdt}`,
      );
      return true;
    }

    return false;
  }
}
