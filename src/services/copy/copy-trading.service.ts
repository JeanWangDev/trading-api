import { Op } from "sequelize";
import { CopyOrderLog, CopySubscription, Strategy, UserSubscription } from "@/db";
import { BadRequestError, NotFoundError } from "@/errors/app-error";
import { config } from "@/config";
import { toOkxSwapInstId } from "@/exchanges/okx/okx-trading.client";
import { ExchangeConnectionService } from "@/services/exchange/exchange-connection.service";
import { PaperTradingService } from "@/services/strategy/paper-trading.service";
import type { BriefSignal } from "@/types/market-brief";

function assertDbReady() {
  if (!config.db.enabled) {
    throw new BadRequestError("数据库未启用");
  }
}

function signalToSide(signal: BriefSignal): "buy" | "sell" | null {
  if (signal === "bullish") return "buy";
  if (signal === "bearish") return "sell";
  return null;
}

export class CopyTradingService {
  static async subscribe(
    userId: number,
    input: {
      strategyKey: string;
      exchangeConnectionId: number;
      orderSizeUsdt?: number;
      tradeMode?: "live" | "paper";
    },
  ) {
    assertDbReady();

    const strategy = await Strategy.findOne({
      where: { strategyKey: input.strategyKey, status: 1 },
    });
    if (!strategy) {
      throw new NotFoundError("策略不存在");
    }

    const now = new Date();
    const sub = await UserSubscription.findOne({
      where: {
        userId,
        planKey: strategy.planKey,
        status: "active",
        endsAt: { [Op.gt]: now },
      },
    });
    if (!sub) {
      throw new BadRequestError("请先跟单付费订阅该策略");
    }

    await ExchangeConnectionService.getOkxClient(input.exchangeConnectionId, userId);

    const existing = await CopySubscription.findOne({
      where: { userId, strategyKey: input.strategyKey },
    });

    const payload = {
      userId,
      strategyKey: input.strategyKey,
      exchangeConnectionId: input.exchangeConnectionId,
      tradeMode: input.tradeMode ?? "live",
      orderSizeUsdt: (input.orderSizeUsdt ?? 100).toFixed(6),
      status: 1,
    };

    if (existing) {
      await existing.update(payload);
      return { id: existing.id, ...payload };
    }

    const row = await CopySubscription.create(payload);
    return { id: row.id, ...payload };
  }

  static async unsubscribe(userId: number, strategyKey: string) {
    assertDbReady();
    const row = await CopySubscription.findOne({
      where: { userId, strategyKey, status: 1 },
    });
    if (!row) {
      throw new NotFoundError("未开启实盘跟单");
    }
    await row.update({ status: 0 });
  }

  static async listForUser(userId: number) {
    assertDbReady();
    const rows = await CopySubscription.findAll({
      where: { userId, status: 1 },
      order: [["updateTime", "DESC"]],
    });

    return rows.map((row) => ({
      id: row.id,
      strategyKey: row.strategyKey,
      exchangeConnectionId: row.exchangeConnectionId,
      tradeMode: row.tradeMode,
      orderSizeUsdt: String(row.orderSizeUsdt),
      lastSignal: row.lastSignal,
    }));
  }

  static async executeForStrategy(strategy: Strategy, signal: BriefSignal) {
    const side = signalToSide(signal);
    if (!side) return;

    const subs = await CopySubscription.findAll({
      where: { strategyKey: strategy.strategyKey, status: 1, tradeMode: "live" },
    });

    for (const sub of subs) {
      if (sub.lastSignal === signal) continue;

      const log = await CopyOrderLog.create({
        copySubscriptionId: sub.id,
        strategyKey: strategy.strategyKey,
        signal,
        side,
        symbol: strategy.symbol,
        sizeUsdt: sub.orderSizeUsdt,
        status: "pending",
      });

      try {
        const client = await ExchangeConnectionService.getOkxClient(
          sub.exchangeConnectionId,
          sub.userId,
        );
        const instId = toOkxSwapInstId(strategy.symbol);
        const orderId = await client.placeMarketOrder({
          instId,
          side,
          sz: "1",
        });

        await log.update({ status: "filled", exchangeOrderId: orderId });
        await sub.update({ lastSignal: signal });
      } catch (error) {
        const message = error instanceof Error ? error.message : "copy order failed";
        await log.update({ status: "failed", errorMessage: message.slice(0, 255) });
        console.error(`[copy] user=${sub.userId} strategy=${strategy.strategyKey}`, error);
      }
    }
  }

  static async tickAll(): Promise<number> {
    const strategies = await Strategy.findAll({ where: { status: 1 } });
    let count = 0;

    for (const strategy of strategies) {
      try {
        const signal = await PaperTradingService.tickStrategy(strategy);
        if (signal) {
          await CopyTradingService.executeForStrategy(strategy, signal);
        }
        count += 1;
      } catch (error) {
        console.error(`[copy] tick failed strategy=${strategy.strategyKey}`, error);
      }
    }

    return count;
  }
}
