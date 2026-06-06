import Router from "@koa/router";
import { config } from "@/config";
import { getSequelize } from "@/db/connection";

const router = new Router();

router.get("/health", async (ctx) => {
  let db: "disabled" | "up" | "down" = "disabled";

  if (config.db.enabled) {
    try {
      const sequelize = await getSequelize();
      if (sequelize) {
        await sequelize.authenticate();
        db = "up";
      } else {
        db = "down";
      }
    } catch {
      db = "down";
    }
  }

  ctx.sendSuccess({
    service: "trading-api",
    uptime: process.uptime(),
    db,
  });
});

export default router;
