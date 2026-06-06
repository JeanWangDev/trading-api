/**
 * 事件 RSS 采集（MVP Lite）
 * 用法：yarn ingest:news
 */
import path from "path";
import dotenv from "dotenv";

const root = process.cwd();
const nodeEnv = process.env.NODE_ENV ?? "development";
dotenv.config({ path: path.resolve(root, `.env.${nodeEnv}`) });

import { runNewsIngest } from "@/ingest/run-news-ingest";

async function main() {
  console.log("[ingest:news] starting…");
  const summary = await runNewsIngest();

  console.log("[ingest:news] RSS:", summary.rss);
  console.log("[ingest:news] total published (bound):", summary.totalPublished);
}

main().catch((err) => {
  console.error("[ingest:news] failed:", err);
  process.exit(1);
});
