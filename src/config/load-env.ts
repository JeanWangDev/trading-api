import dotenv from "dotenv";
import path from "path";

/**
 * 环境变量加载（单环境工作流）
 *
 * 1. 始终先读 `.env.development` — 本地与 VPS 共用这一份（密钥、DB、邮件等）
 * 2. 再读 `.env.{NODE_ENV}`，且 **不覆盖** 已有项（pre/production 模板仅作可选补充）
 */
export function loadEnvFiles(): string {
  const root = process.cwd();
  const nodeEnv = process.env.NODE_ENV || "development";

  dotenv.config({ path: path.resolve(root, ".env.development") });
  dotenv.config({
    path: path.resolve(root, `.env.${nodeEnv}`),
    override: false,
  });

  return nodeEnv;
}
