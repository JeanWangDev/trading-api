import { CreatorBalance, CreatorLedger, CreatorWithdrawal } from "@/db";
import { BadRequestError } from "@/errors/app-error";
import { config } from "@/config";

function assertDbReady() {
  if (!config.db.enabled) {
    throw new BadRequestError("数据库未启用");
  }
}

async function getOrCreateBalance(userId: number): Promise<CreatorBalance> {
  let row = await CreatorBalance.findByPk(userId);
  if (!row) {
    row = await CreatorBalance.create({
      userId,
      availableUsdt: "0",
      pendingUsdt: "0",
      lifetimeEarnedUsdt: "0",
    });
  }
  return row;
}

export class CreatorPayoutService {
  static async creditFollowFee(input: {
    creatorUserId: number;
    amountUsdt: string;
    followId: number;
    note?: string;
  }) {
    assertDbReady();

    const amount = Number(input.amountUsdt);
    if (!Number.isFinite(amount) || amount <= 0) return;

    const balance = await getOrCreateBalance(input.creatorUserId);
    const available = Number(balance.availableUsdt) + amount;
    const lifetime = Number(balance.lifetimeEarnedUsdt) + amount;

    await balance.update({
      availableUsdt: available.toFixed(6),
      lifetimeEarnedUsdt: lifetime.toFixed(6),
    });

    await CreatorLedger.create({
      userId: input.creatorUserId,
      type: "follow_fee",
      amountUsdt: amount.toFixed(6),
      refFollowId: input.followId,
      note: input.note ?? "跟单分成",
    });
  }

  static async getBalance(userId: number) {
    assertDbReady();
    const balance = await getOrCreateBalance(userId);
    const ledger = await CreatorLedger.findAll({
      where: { userId },
      order: [["createTime", "DESC"]],
      limit: 20,
    });

    return {
      availableUsdt: String(balance.availableUsdt),
      pendingUsdt: String(balance.pendingUsdt),
      lifetimeEarnedUsdt: String(balance.lifetimeEarnedUsdt),
      ledger: ledger.map((row) => ({
        id: Number(row.id),
        type: row.type,
        amountUsdt: String(row.amountUsdt),
        note: row.note,
        createTime: row.createTime.getTime(),
      })),
    };
  }

  static async requestWithdrawal(
    userId: number,
    input: { amountUsdt: number; address: string; chain?: string },
  ) {
    assertDbReady();

    if (input.amountUsdt <= 0) {
      throw new BadRequestError("提现金额无效");
    }

    const address = input.address.trim();
    if (address.length < 10) {
      throw new BadRequestError("提现地址无效");
    }

    const balance = await getOrCreateBalance(userId);
    const available = Number(balance.availableUsdt);
    if (input.amountUsdt > available) {
      throw new BadRequestError("可提现余额不足");
    }

    const withdrawal = await CreatorWithdrawal.create({
      userId,
      amountUsdt: input.amountUsdt.toFixed(6),
      chain: input.chain ?? "TRC20",
      address,
      status: "pending",
    });

    await balance.update({
      availableUsdt: (available - input.amountUsdt).toFixed(6),
      pendingUsdt: (Number(balance.pendingUsdt) + input.amountUsdt).toFixed(6),
    });

    await CreatorLedger.create({
      userId,
      type: "withdraw",
      amountUsdt: (-input.amountUsdt).toFixed(6),
      refWithdrawalId: Number(withdrawal.id),
      note: "提现申请",
    });

    return {
      withdrawalId: Number(withdrawal.id),
      status: withdrawal.status,
      amountUsdt: String(withdrawal.amountUsdt),
    };
  }
}
