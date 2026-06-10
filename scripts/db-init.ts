/**
 * 初始化数据库（yarn db:init）
 */
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

const root = process.cwd();
const env = process.env.NODE_ENV || "development";

dotenv.config({ path: path.resolve(root, `.env.${env}`) });

const host = process.env.DB_HOST ?? "";
const port = Number(process.env.DB_PORT ?? "4000");
const user = process.env.DB_USER ?? "";
const password = process.env.DB_PASSWORD ?? "";
const database = process.env.DB_NAME ?? "trading-alpha";
const sslEnabled = process.env.DB_SSL !== "false";
const escapedDatabase = database.replace(/`/g, "``");

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
  "scripts/sql/chain-order.sql",
  "scripts/sql/chain-order-risk-config.sql",
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
      ? { ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true } }
      : {}),
  });

  try {
    console.log(`[db:init] ${host}:${port}/${database}`);
    for (const file of sqlFiles) {
      const sql = fs
        .readFileSync(path.resolve(root, file), "utf8")
        .replaceAll("`trading-alpha`", `\`${escapedDatabase}\``);
      await connection.query(sql);
      console.log(`[db:init] ${file}`);
    }
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error("[db:init]", err.message ?? err);
  process.exit(1);
});
