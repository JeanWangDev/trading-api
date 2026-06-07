/**
 * RSS 定时采集（PM2: trading-ingest）
 * 间隔：.env.production 里 INGEST_INTERVAL_MS（默认 15 分钟）
 */
import dotenv from "dotenv";
import path from "path";
import { registerModuleAliases } from "../src/register-aliases";

const env = process.env.NODE_ENV || "production";
dotenv.config({ path: path.resolve(process.cwd(), `.env.${env}`) });

registerModuleAliases(__dirname);

import { initDatabase } from "@/db/connection";
import { initModels } from "@/db";
import { runNewsIngest } from "@/ingest/run-news-ingest";

const INTERVAL_MS = parseInt(process.env.INGEST_INTERVAL_MS || "900000", 10);
const MIN_GAP_MS = 5_000;

function formatInterval(ms: number): string {
  if (ms % 60_000 === 0) return `${ms / 60_000} 分钟`;
  return `${Math.round(ms / 1000)} 秒`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loop(): Promise<void> {
  await initDatabase();
  await initModels();

  console.log(
    `[ingest-loop] started env=${env} interval=${INTERVAL_MS}ms (${formatInterval(INTERVAL_MS)})`,
  );

  for (;;) {
    const started = Date.now();
    try {
      const summary = await runNewsIngest();
      console.log("[ingest-loop] done:", JSON.stringify(summary));
    } catch (error) {
      console.error("[ingest-loop] failed:", error);
    }

    const elapsed = Date.now() - started;
    const wait = Math.max(MIN_GAP_MS, INTERVAL_MS - elapsed);
    const nextAt = new Date(Date.now() + wait).toISOString();
    console.log(`[ingest-loop] next run at ${nextAt} (sleep ${wait}ms)`);
    await sleep(wait);
  }
}

loop().catch((error) => {
  console.error("[ingest-loop] fatal:", error);
  process.exit(1);
});
