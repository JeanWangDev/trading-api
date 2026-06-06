import dotenv from "dotenv";
import fs from "fs";
import path from "path";

/**
 * 按 NODE_ENV 加载环境文件。
 * production 时：优先 .env.production，不存在则回退 .env.development
 * （本地 / VPS 均可 yarn deploy:prod）
 */
export function loadEnvFiles(): string {
  const root = process.cwd();
  const nodeEnv = process.env.NODE_ENV || "development";
  const primaryPath = path.resolve(root, `.env.${nodeEnv}`);
  const devFallback = path.resolve(root, ".env.development");

  if (fs.existsSync(primaryPath)) {
    dotenv.config({ path: primaryPath });
    return nodeEnv;
  }

  if (nodeEnv === "production" && fs.existsSync(devFallback)) {
    console.warn("[env] 未找到 .env.production，回退使用 .env.development");
    dotenv.config({ path: devFallback });
    return nodeEnv;
  }

  console.warn(
    `[env] 未找到 ${primaryPath}` +
      (nodeEnv === "production" ? " 或 .env.development" : "") +
      ` — 请 cp .env.${nodeEnv}.example .env.${nodeEnv} 并填写`,
  );

  return nodeEnv;
}
