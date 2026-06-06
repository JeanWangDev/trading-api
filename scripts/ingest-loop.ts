/**
 * 定时采集循环（供 PM2 trading-ingest 使用，默认 15 分钟）
 */
import "module-alias/register";
import { initDatabase } from "@/db/connection";
import { initModels } from "@/db";
import { runNewsIngest } from "@/ingest/run-news-ingest";

const INTERVAL_MS = parseInt(process.env.INGEST_INTERVAL_MS || "900000", 10);

async function loop() {
  await initDatabase();
  await initModels();

  console.log(`[ingest-loop] interval ${INTERVAL_MS}ms`);

  for (;;) {
    const started = Date.now();
    try {
      const summary = await runNewsIngest();
      console.log("[ingest-loop] done:", JSON.stringify(summary));
    } catch (error) {
      console.error("[ingest-loop] failed:", error);
    }

    const elapsed = Date.now() - started;
    const wait = Math.max(5_000, INTERVAL_MS - elapsed);
    await new Promise((r) => setTimeout(r, wait));
  }
}

void loop();
