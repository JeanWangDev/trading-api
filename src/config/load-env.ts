import dotenv from "dotenv";
import fs from "fs";
import path from "path";

/**
 * 按 NODE_ENV 加载对应环境文件（demo-server 同款）：
 *   development → .env.development
 *   pre         → .env.pre
 *   production  → .env.production
 */
export function loadEnvFiles(): string {
  const root = process.cwd();
  const nodeEnv = process.env.NODE_ENV || "development";
  const envPath = path.resolve(root, `.env.${nodeEnv}`);

  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  } else {
    console.warn(
      `[env] 未找到 ${envPath} — 请 cp .env.${nodeEnv}.example .env.${nodeEnv} 并填写`,
    );
  }

  return nodeEnv;
}
