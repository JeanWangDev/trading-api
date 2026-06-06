import Koa from "koa";
import bodyParser from "koa-bodyparser";
import compress from "koa-compress";
import { constants as zlibConstants } from "zlib";
import {
  accessOriginMiddleware,
  apiResponseMiddleware,
} from "@/middlewares/api-response.middleware";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { errorMiddleware } from "@/middlewares/error.middleware";
import {
  loggerMiddleware,
  responseTimeMiddleware,
} from "@/middlewares/logger.middleware";
import { marketRateLimitMiddleware } from "@/middlewares/rate-limit.middleware";
import mainRouter from "@/routes";
import healthRouter from "@/routes/health";

/**
 * Middleware pipeline (demo-server order + trading-api additions):
 *
 *   CORS → apiResponse → error → logger → compress → bodyParser
 *        → responseTime → rateLimit → auth → health + router
 */
export function createApp() {
  const app = new Koa();

  app.use(accessOriginMiddleware);
  app.use(apiResponseMiddleware);
  app.use(errorMiddleware);
  app.use(loggerMiddleware);

  app.use(
    compress({
      threshold: 1024,
      gzip: { flush: zlibConstants.Z_SYNC_FLUSH },
      deflate: { flush: zlibConstants.Z_SYNC_FLUSH },
      br: false,
    }),
  );

  app.use(bodyParser());
  app.use(responseTimeMiddleware);
  app.use(marketRateLimitMiddleware);
  app.use(authMiddleware);

  app.use(healthRouter.routes());
  app.use(mainRouter.routes());
  app.use(mainRouter.allowedMethods());

  return app;
}
