/**
 * 策略模拟盘 + 实盘跟单监听（PM2: trading-strategy-watch）
 */
import dotenv from "dotenv";
import path from "path";
import { registerModuleAliases } from "../src/register-aliases";

const env = process.env.NODE_ENV || "production";
dotenv.config({ path: path.resolve(process.cwd(), `.env.${env}`) });

registerModuleAliases(__dirname);

import { initDatabase } from "@/db/connection";
import { initModels } from "@/db";
import { config } from "@/config";
import { CopyTradingService } from "@/services/copy/copy-trading.service";

const INTERVAL_MS = config.strategy.copyWatchIntervalMs;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tick(): Promise<void> {
  const count = await CopyTradingService.tickAll();
  if (count > 0) {
    console.log(`[strategy-watch] ticked=${count}`);
  }
}

async function loop(): Promise<void> {
  await initDatabase();
  await initModels();

  console.log(
    `[strategy-watch] started env=${env} interval=${INTERVAL_MS}ms`,
  );

  for (;;) {
    try {
      await tick();
    } catch (error) {
      console.error("[strategy-watch] tick failed", error);
    }
    await sleep(INTERVAL_MS);
  }
}

void loop();
