import { registerModuleAliases } from "./register-aliases";

registerModuleAliases(__dirname);

import { createServer } from "http";
import { createApp } from "@/app";
import { config } from "@/config";
import { initDatabase } from "@/db/connection";
import { initModels } from "@/db";
import { warmUpstream } from "@/utils/http-client";
import { startBinanceLiquidationWorker } from "@/ingest/binance-liquidation.worker";
import { createEventsWsServer } from "@/ws/events-hub";
import { createMarketWsServer } from "@/ws/market-hub";
import { attachWsUpgradeRouter } from "@/ws/upgrade-router";
import { verifyEventsWsUpgrade } from "@/ws/ws-auth";

const DB_MAX_ATTEMPTS = 5;

async function connectDatabaseWithRetry() {
  if (!config.db.enabled) {
    console.warn("[db] disabled — running without MySQL");
    return;
  }

  for (let attempt = 1; attempt <= DB_MAX_ATTEMPTS; attempt++) {
    try {
      await initDatabase();
      await initModels();
      console.log(
        `[db] connected to mysql://${config.db.host}:${config.db.port}/${config.db.database}`,
      );
      return;
    } catch (error) {
      if (attempt >= DB_MAX_ATTEMPTS) {
        throw error;
      }

      const waitMs = attempt * 2_000;
      console.warn(
        `[db] connection failed (attempt ${attempt}/${DB_MAX_ATTEMPTS}), retrying in ${waitMs}ms…`,
      );
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
}

async function startServer() {
  if (config.db.enabled) {
    await connectDatabaseWithRetry();
  }

  const app = createApp();
  const httpServer = createServer(app.callback());

  const marketWss = createMarketWsServer();
  const eventsWss = createEventsWsServer();
  attachWsUpgradeRouter(httpServer, [
    { path: config.marketWsPath, wss: marketWss },
    {
      path: config.eventsWsPath,
      wss: eventsWss,
      verifyUpgrade: verifyEventsWsUpgrade,
    },
  ]);

  if (config.db.enabled && config.liquidationWorkerEnabled) {
    startBinanceLiquidationWorker();
  }

  httpServer.listen(config.port, "0.0.0.0", () => {
    console.log(
      `trading-api listening on http://localhost:${config.port} (${config.env} mode)`,
    );
    console.log(
      `market ws ready at ws://localhost:${config.port}${config.marketWsPath}`,
    );
    console.log(
      `events ws ready at ws://localhost:${config.port}${config.eventsWsPath}`,
    );

    void warmUpstream(`${config.binanceRestBaseUrl}/api/v3/time`);
  });
}

void startServer();

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
  process.exit(1);
});
