import dotenv from "dotenv";
import fs from "fs";
import path from "path";

/**
 * 单环境：只读项目根目录 `.env`（旧名 `.env.development` 仍兼容一次）
 */
export function loadEnvFiles(): string {
  const root = process.cwd();
  const envPath = path.resolve(root, ".env");
  const legacyPath = path.resolve(root, ".env.development");

  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  } else if (fs.existsSync(legacyPath)) {
    console.warn("[env] 建议将 .env.development 重命名为 .env");
    dotenv.config({ path: legacyPath });
  } else {
    console.warn("[env] 未找到 .env — 请 cp .env.example .env 并填写 TiDB / JWT 等");
  }

  return process.env.NODE_ENV || "production";
}
