import dotenv from "dotenv";
import fs from "fs";
import path from "path";

function loadEnvFile(filePath: string): number {
  if (!fs.existsSync(filePath)) {
    return 0;
  }

  const result = dotenv.config({ path: filePath });
  const count = Object.keys(result.parsed ?? {}).length;

  if (count === 0) {
    console.warn(`[env] ${path.basename(filePath)} 存在但为空（0 个变量），跳过`);
  }

  return count;
}

/**
 * 按 NODE_ENV 加载环境文件。
 * production：优先 .env.production，无效则回退 .env.development
 */
export function loadEnvFiles(): string {
  const root = process.cwd();
  const nodeEnv = process.env.NODE_ENV || "development";
  const primaryPath = path.resolve(root, `.env.${nodeEnv}`);
  const devFallback = path.resolve(root, ".env.development");

  const primaryCount = loadEnvFile(primaryPath);
  if (primaryCount > 0) {
    return nodeEnv;
  }

  if (nodeEnv === "production") {
    const fallbackCount = loadEnvFile(devFallback);
    if (fallbackCount > 0) {
      console.warn("[env] 未找到有效 .env.production，回退使用 .env.development");
      return nodeEnv;
    }
  }

  console.warn(
    `[env] 未找到有效配置 — 请创建 .env.${nodeEnv}` +
      (nodeEnv === "production" ? " 或填写 .env.development" : "") +
      `（cp .env.${nodeEnv}.example .env.${nodeEnv}）`,
  );

  return nodeEnv;
}
