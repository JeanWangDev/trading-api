import Router from "@koa/router";
import { MarketController } from "@/controllers/market";

const router = new Router({ prefix: "/market" });

router.get("/exchanges", MarketController.listExchanges);
router.get("/time", MarketController.getServerTime);
router.get("/klines", MarketController.getKlines);
router.get("/price-levels", MarketController.getPriceLevels);
router.get("/brief", MarketController.getMarketBrief);
router.get("/symbols", MarketController.searchSymbols);
router.get("/trading-pairs", MarketController.listTradingPairs);
router.get("/symbol-info", MarketController.getSymbolInfo);
router.get("/ticker", MarketController.getTicker24h);

export default router;
