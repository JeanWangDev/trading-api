import dotenv from "dotenv";
import path from "path";

/** 运行时配置结构 */
export interface AppConfig {
  port: number;
  env: string;
  isDev: boolean;
  isProd: boolean;
  clientOrigins: string[];
  jwtSecret: string;
  jwtExpiresIn: string;
  authSkipPaths: string[];
  marketRateLimitPerMin: number;
  binanceRestBaseUrl: string;
  binanceWsBaseUrl: string;
  marketWsPath: string;
  eventsWsPath: string;
  liquidationWorkerEnabled: boolean;
  eventsWsRequireAuth: boolean;
  mail: {
    enabled: boolean;
    resendApiKey: string;
    from: string;
  };
  db: {
    enabled: boolean;
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    ssl: boolean;
    asm: string;
  };
}

const env = process.env.NODE_ENV || "development";
dotenv.config({ path: path.resolve(process.cwd(), `.env.${env}`) });

function envBool(key: string, fallback = false): boolean {
  const value = process.env[key];
  if (value === undefined) return fallback;
  return value === "true";
}

function envList(key: string, fallback: string): string[] {
  return (process.env[key] || fallback)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const development: AppConfig = {
  port: parseInt(process.env.PORT || "4000", 10),
  env: "development",
  isDev: true,
  isProd: false,
  clientOrigins: envList("CLIENT_ORIGINS", "http://localhost:3000"),
  jwtSecret: process.env.JWT_SECRET || "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  authSkipPaths: envList(
    "AUTH_SKIP_PATHS",
    "/health,/api/v1/market,/api/v1/dashboard,/api/v1/events,/ws/market,/ws/events",
  ),
  marketRateLimitPerMin: parseInt(process.env.MARKET_RATE_LIMIT_PER_MIN || "120", 10),
  binanceRestBaseUrl:
    process.env.BINANCE_REST_BASE_URL || "https://data-api.binance.vision",
  binanceWsBaseUrl: process.env.BINANCE_WS_BASE_URL || "wss://stream.binance.com:9443",
  marketWsPath: process.env.MARKET_WS_PATH || "/ws/market",
  eventsWsPath: process.env.EVENTS_WS_PATH || "/ws/events",
  liquidationWorkerEnabled: envBool("LIQUIDATION_WORKER_ENABLED", true),
  eventsWsRequireAuth: envBool("EVENTS_WS_REQUIRE_AUTH", false),
  mail: {
    enabled: envBool("MAIL_ENABLED", false),
    resendApiKey: process.env.RESEND_API_KEY || "",
    from: process.env.MAIL_FROM || "Polaris <noreply@aipassly.com>",
  },
  db: {
    enabled: envBool("DB_ENABLED", true),
    host: process.env.DB_HOST || "",
    port: parseInt(process.env.DB_PORT || "4000", 10),
    user: process.env.DB_USER || "",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "trading-alpha",
    ssl: envBool("DB_SSL", true),
    asm: process.env.DB_ASM || "",
  },
};

const pre: AppConfig = {
  ...development,
  env: "pre",
  isDev: false,
  isProd: true,
  clientOrigins: envList(
    "CLIENT_ORIGINS",
    "https://alpha.aipassly.com,https://aipassly.com,https://www.aipassly.com",
  ),
};

const production: AppConfig = {
  ...development,
  env: "production",
  isDev: false,
  isProd: true,
  clientOrigins: envList(
    "CLIENT_ORIGINS",
    "https://alpha.aipassly.com,https://aipassly.com,https://www.aipassly.com",
  ),
};

const configs: Record<string, AppConfig> = {
  development,
  pre,
  production,
};

export const config = configs[env] ?? development;

if (!config.jwtSecret.trim()) {
  throw new Error(`JWT_SECRET is required — 请在 .env.${env} 中配置`);
}

if (
  config.db.enabled &&
  (!config.db.host.trim() || !config.db.user.trim() || !config.db.database.trim())
) {
  throw new Error("DB_HOST, DB_USER, DB_NAME are required when DB_ENABLED=true");
}
