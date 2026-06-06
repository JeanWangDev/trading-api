/**
 * 清理 MVP Lite 不需要的历史事件数据
 *
 * 用法：yarn db:cleanup
 */
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import type { Connection, RowDataPacket } from "mysql2/promise";

const root = process.cwd();
const nodeEnv = process.env.NODE_ENV ?? "development";
dotenv.config({ path: path.resolve(root, `.env.${nodeEnv}`) });

const host = process.env.DB_HOST ?? "127.0.0.1";
const port = Number(process.env.DB_PORT ?? "3306");
const user = process.env.DB_USER ?? "root";
const password = process.env.DB_PASSWORD ?? "";
const dbName = process.env.DB_NAME ?? "trading-alpha";
const sslEnabled = process.env.DB_SSL === "true";

async function columnExists(
  connection: Connection,
  table: string,
  column: string,
): Promise<boolean> {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT 1 AS ok FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?
     LIMIT 1`,
    [dbName, table, column],
  );
  return rows.length > 0;
}

async function dropColumnIfExists(
  connection: Connection,
  table: string,
  column: string,
): Promise<void> {
  const exists = await columnExists(connection, table, column);
  if (!exists) {
    console.log(`[db:cleanup] skip DROP ${table}.${column} (not exists)`);
    return;
  }
  await connection.query(`ALTER TABLE \`${table}\` DROP COLUMN \`${column}\``);
  console.log(`[db:cleanup] dropped ${table}.${column}`);
}

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
    console.log(`[db:cleanup] connecting to ${host}:${port} as ${user}`);

    const cleanupSql = fs.readFileSync(
      path.resolve(root, "scripts/sql/cleanup-mvp-lite.sql"),
      "utf8",
    );
    const [deleteResult] = await connection.query(cleanupSql);
    console.log("[db:cleanup] cleanup-mvp-lite.sql:", deleteResult);

    await dropColumnIfExists(connection, "t_event", "f_ai");
    await dropColumnIfExists(connection, "t_event", "f_content");

    const symbolSql = fs.readFileSync(
      path.resolve(root, "scripts/sql/symbol.sql"),
      "utf8",
    );
    await connection.query(symbolSql);
    console.log("[db:cleanup] ensured t_trading_symbol seeds");

    const [eventRows] = await connection.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS eventCount FROM t_event",
    );
    const [symbolRows] = await connection.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS symbolCount FROM t_trading_symbol WHERE f_status = 1",
    );
    const eventCount = Number(eventRows[0]?.eventCount ?? 0);
    const symbolCount = Number(symbolRows[0]?.symbolCount ?? 0);
    console.log(
      `[db:cleanup] done. t_event rows=${eventCount}, active symbols=${symbolCount}`,
    );
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error("[db:cleanup] failed:", err.message ?? err);
  process.exit(1);
});
