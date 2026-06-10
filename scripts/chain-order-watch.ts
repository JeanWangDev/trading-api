/**
 * 链上交易订单监听（PM2: trading-chain-order-watch）
 *
 * 负责在用户关闭页面、前端没有等到 receipt、或网络中断时，补扫 submitted
 * 订单的 EVM transaction receipt，并更新 confirmed / failed 状态。
 */
import dotenv from "dotenv";
import path from "path";
import { registerModuleAliases } from "../src/register-aliases";

const env = process.env.NODE_ENV || "production";
dotenv.config({ path: path.resolve(process.cwd(), `.env.${env}`) });

registerModuleAliases(__dirname);

import { config } from "@/config";
import { initModels } from "@/db";
import { initDatabase } from "@/db/connection";
import { ChainOrderService } from "@/services/chain-order";

const INTERVAL_MS = config.chainOrders.watchIntervalMs;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tick(): Promise<void> {
  const result = await ChainOrderService.syncSubmittedReceipts();
  if (
    result.checked > 0 ||
    result.confirmed > 0 ||
    result.failed > 0 ||
    result.errors > 0
  ) {
    console.log(
      `[chain-order-watch] checked=${result.checked} confirmed=${result.confirmed} failed=${result.failed} pending=${result.pending} skipped=${result.skipped} errors=${result.errors}`,
    );
  }
}

async function loop(): Promise<void> {
  await initDatabase();
  await initModels();

  console.log(
    `[chain-order-watch] started env=${env} interval=${INTERVAL_MS}ms batch=${config.chainOrders.watchBatchSize}`,
  );

  for (;;) {
    try {
      await tick();
    } catch (error) {
      console.error("[chain-order-watch] tick failed", error);
    }

    await sleep(INTERVAL_MS);
  }
}

loop().catch((error) => {
  console.error("[chain-order-watch] fatal", error);
  process.exit(1);
});
