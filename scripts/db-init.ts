/**
 * 初始化数据库表结构（执行 scripts/sql/init.sql）
 *
 * 与运行时相同：读 `.env`
 * 使用变量：DB_HOST、DB_PORT、DB_USER、DB_PASSWORD、DB_SSL
 *
 * 用法：yarn db:init
 */
import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import { loadEnvFiles } from "../src/config/load-env";

loadEnvFiles();

const host = process.env.DB_HOST ?? "";
const port = Number(process.env.DB_PORT ?? "4000");
const user = process.env.DB_USER ?? "";
const password = process.env.DB_PASSWORD ?? "";
const sslEnabled = process.env.DB_SSL !== "false";

const sqlFiles = [
  "scripts/sql/init.sql",
  "scripts/sql/event.sql",
  "scripts/sql/symbol-table.sql",
  "scripts/sql/trading-symbol-access-tier.sql",
  "scripts/sql/symbol-seed.sql",
  "scripts/sql/chart-template.sql",
  "scripts/sql/chart-template-migrate-symbol-id.sql",
  "scripts/sql/chart-template-migrate-visibility.sql",
  "scripts/sql/chart-template-seed-official.sql",
  "scripts/sql/chart-template-usage.sql",
  "scripts/sql/email-verification.sql",
];

async function main() {
  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true,
    charset: "utf8mb4",
    ...(sslEnabled
      ? {
          ssl: {
            minVersion: "TLSv1.2",
            rejectUnauthorized: true,
          },
        }
      : {}),
  });

  try {
    console.log(`[db:init] connecting to ${host}:${port} as ${user} (ssl=${sslEnabled})`);
    for (const file of sqlFiles) {
      const sql = fs.readFileSync(path.resolve(root, file), "utf8");
      await connection.query(sql);
      console.log(`[db:init] applied ${file}`);
    }
    console.log("[db:init] schema applied successfully");
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error("[db:init] failed:", err.message ?? err);
  process.exit(1);
});
