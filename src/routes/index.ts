import Router from "@koa/router";
import v1Routes from "./v1";

const router = new Router({ prefix: "/api" });

router.get("/v1", (ctx) => {
  ctx.sendSuccess({
    message: "Trading API is running.",
    endpoints: [
      "/api/v1/dashboard/overview",
      "/api/v1/auth/me",
      "/api/v1/market/exchanges",
      "/api/v1/market/time",
      "/api/v1/market/klines",
      "/api/v1/market/symbols",
      "/api/v1/market/trading-pairs",
      "/api/v1/market/symbol-info",
      "/api/v1/market/ticker",
      "/ws/market",
      "/health",
    ],
  });
});

router.use(v1Routes.routes(), v1Routes.allowedMethods());

export default router;
