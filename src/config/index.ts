/**
 * 应用配置
 *
 * 环境变量加载见 `load-env.ts`：
 *   - **主配置**：`.env.development`（本地 + 服务器共用一份即可）
 *   - **可选补充**：`.env.pre` / `.env.production`（不覆盖 development 里已有项）
 *
 * 模板：`.env.development.example`
 */
import { loadEnvFiles } from "@/config/load-env";

/** 运行时配置结构；字段与 `.env.*` 中的变量一一对应 */
export interface AppConfig {
  /** HTTP 监听端口，对应 PORT */
  port: number;
  /** 当前环境名：development | pre | production */
  env: string;
  /** 是否开发环境（便于分支判断，如开发态返回重置 token） */
  isDev: boolean;
  /** 是否生产环境 */
  isProd: boolean;
  /** CORS 允许的 Origin 列表，对应 CLIENT_ORIGINS（逗号分隔） */
  clientOrigins: string[];
  /** JWT 签名密钥；开发环境可留空则仅校验 Token 是否存在，对应 JWT_SECRET */
  jwtSecret: string;
  /** Access Token 有效期，对应 JWT_EXPIRES_IN，如 7d、12h */
  jwtExpiresIn: string;
  /** 无需登录的路径前缀，对应 AUTH_SKIP_PATHS（逗号分隔） */
  authSkipPaths: string[];
  /** /api/v1/market/* 每 IP 每分钟请求上限，对应 MARKET_RATE_LIMIT_PER_MIN */
  marketRateLimitPerMin: number;
  /** Binance REST 根地址，对应 BINANCE_REST_BASE_URL */
  binanceRestBaseUrl: string;
  /** Binance WebSocket 根地址，对应 BINANCE_WS_BASE_URL */
  binanceWsBaseUrl: string;
  /** 本服务行情 WS 挂载路径，对应 MARKET_WS_PATH */
  marketWsPath: string;
  /** 事件流 WS 路径，对应 EVENTS_WS_PATH */
  eventsWsPath: string;
  /** 是否启动 Binance 爆仓 WS 入库，对应 LIQUIDATION_WORKER_ENABLED */
  liquidationWorkerEnabled: boolean;
  /** 事件 WS 是否要求 JWT（默认 false，公开只读 feed） */
  eventsWsRequireAuth: boolean;
  mail: {
    /** 是否通过 Resend 真实发信；false 时仅开发环境打日志 */
    enabled: boolean;
    resendApiKey: string;
    /** 发件人，如 Polaris <noreply@aipassly.com> */
    from: string;
  };
  db: {
    /** 是否启动时连接数据库，对应 DB_ENABLED（true/false） */
    enabled: boolean;
    /** 数据库主机，对应 DB_HOST */
    host: string;
    /** 数据库端口，对应 DB_PORT（TiDB Cloud 一般为 4000） */
    port: number;
    /** 数据库用户，对应 DB_USER */
    user: string;
    /** 数据库密码，对应 DB_PASSWORD */
    password: string;
    /** 库名，对应 DB_NAME */
    database: string;
    /** 是否启用 TLS，对应 DB_SSL（TiDB Cloud 需 true） */
    ssl: boolean;
    /** KMS/密钥服务中的 DB 密码键名（预发/生产可选），对应 DB_ASM */
    asm: string;
  };
}

// ---------------------------------------------------------------------------
// 加载环境变量（以 .env.development 为主）
// ---------------------------------------------------------------------------
const nodeEnv = loadEnvFiles();

/** 解析布尔环境变量：仅当值为字符串 "true" 时为 true */
function envBool(key: string, fallback = false): boolean {
  const value = process.env[key];
  if (value === undefined) return fallback;
  return value === "true";
}

/** 解析逗号分隔列表（去空格、去空项） */
function envList(key: string, fallback: string): string[] {
  return (process.env[key] || fallback)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * 从 process.env 组装一份配置。
 * demo-server 为 development/pre/production 各写一份；此处用函数避免重复。
 */
function buildConfig(envName: string): AppConfig {
  return {
    // --- 服务 ---
    port: parseInt(process.env.PORT || "4000", 10),
    env: envName,
    isDev: envName === "development",
    isProd: envName === "production",

    // --- CORS ---
    clientOrigins: envList("CLIENT_ORIGINS", "http://localhost:3000"),

    // --- 认证 ---
    jwtSecret: process.env.JWT_SECRET || "",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
    authSkipPaths: envList(
      "AUTH_SKIP_PATHS",
      "/health,/api/v1/market,/api/v1/dashboard,/api/v1/events,/ws/market,/ws/events",
    ),

    // --- 行情 / 限流 ---
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

    // --- 数据库 ---
    db: {
      enabled: envBool("DB_ENABLED", true),
      host: process.env.DB_HOST || "127.0.0.1",
      port: parseInt(process.env.DB_PORT || "3306", 10),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "trading-alpha",
      ssl: envBool("DB_SSL"),
      asm: process.env.DB_ASM || "",
    },
  };
}

// demo-server 同款：按环境导出三份，便于 `config.env === development.env` 等判断
export const development = buildConfig("development");
export const pre = buildConfig("pre");
export const production = buildConfig("production");

const configs: Record<string, AppConfig> = {
  development,
  pre,
  production,
};

/** 当前进程使用的配置（与 NODE_ENV 对应） */
export const config = configs[nodeEnv] ?? development;

// ---------------------------------------------------------------------------
// 启动前校验（pre / production 必填项）
// ---------------------------------------------------------------------------
if ((config.env === "pre" || config.env === "production") && !config.jwtSecret.trim()) {
  throw new Error("JWT_SECRET is required when NODE_ENV is pre or production");
}

if (
  config.db.enabled &&
  (config.env === "pre" || config.env === "production") &&
  (!config.db.host.trim() || !config.db.user.trim() || !config.db.database.trim())
) {
  throw new Error("DB_HOST, DB_USER and DB_NAME are required when DB is enabled in pre/production");
}
