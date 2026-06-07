/**
 * 单次 RSS 采集：yarn ingest:news
 */
import { registerModuleAliases } from "../src/register-aliases";

registerModuleAliases(__dirname);

import { initDatabase } from "@/db/connection";
import { initModels } from "@/db";
import { runNewsIngest } from "@/ingest/run-news-ingest";

async function main() {
  await initDatabase();
  await initModels();
  const summary = await runNewsIngest();
  console.log("[ingest:news]", summary);
}

main().catch((err) => {
  console.error("[ingest:news]", err);
  process.exit(1);
});
