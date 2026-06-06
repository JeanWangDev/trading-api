/**
 * 单独执行模版使用统计表迁移（已有库升级用）
 * 用法：yarn migrate:template-usage
 */
import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import { loadEnvFiles } from "../src/config/load-env";

loadEnvFiles();

const root = process.cwd();

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST ?? "",
    port: Number(process.env.DB_PORT ?? "4000"),
    user: process.env.DB_USER ?? "",
    password: process.env.DB_PASSWORD ?? "",
    multipleStatements: true,
    charset: "utf8mb4",
    ...(process.env.DB_SSL === "true"
      ? { ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true } }
      : {}),
  });

  try {
    const sql = fs.readFileSync(
      path.resolve(root, "scripts/sql/chart-template-usage.sql"),
      "utf8",
    );
    await connection.query(sql);
    console.log("[migrate:template-usage] applied chart-template-usage.sql");
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error("[migrate:template-usage] failed:", err.message ?? err);
  process.exit(1);
});
