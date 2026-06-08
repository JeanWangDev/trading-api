/**
 * 链上支付监听 + 订阅到期处理（PM2: trading-payment-watch）
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
import { BillingOrderService, BillingSubscriptionService } from "@/services/billing";

const INTERVAL_MS = config.billing.watchIntervalMs;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tick(): Promise<void> {
  const expiredOrders = await BillingOrderService.expirePendingOrders();
  const scan = await BillingOrderService.scanPendingOrders();
  const expiredSubs = await BillingSubscriptionService.expireDueSubscriptions();

  if (expiredOrders > 0 || scan.paid > 0 || expiredSubs > 0) {
    console.log(
      `[payment-watch] expiredOrders=${expiredOrders} scanned=${scan.checked} paid=${scan.paid} expiredSubs=${expiredSubs}`,
    );
  }
}

async function loop(): Promise<void> {
  await initDatabase();
  await initModels();

  console.log(
    `[payment-watch] started env=${env} interval=${INTERVAL_MS}ms billing=${config.billing.enabled} devAuto=${config.billing.devAutoConfirm}`,
  );

  for (;;) {
    try {
      await tick();
    } catch (error) {
      console.error("[payment-watch] tick failed", error);
    }

    await sleep(INTERVAL_MS);
  }
}

loop().catch((error) => {
  console.error("[payment-watch] fatal", error);
  process.exit(1);
});
