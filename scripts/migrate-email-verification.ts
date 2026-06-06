/**
 * 邮箱验证码表迁移
 * 用法：yarn migrate:email-verification
 */
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

const root = process.cwd();
dotenv.config({ path: path.resolve(root, `.env.${process.env.NODE_ENV ?? "development"}`) });

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? "3306"),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    multipleStatements: true,
    charset: "utf8mb4",
    ...(process.env.DB_SSL === "true"
      ? { ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true } }
      : {}),
  });

  try {
    const sql = fs.readFileSync(
      path.resolve(root, "scripts/sql/email-verification.sql"),
      "utf8",
    );
    await connection.query(sql);
    console.log("[migrate:email-verification] applied email-verification.sql");
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error("[migrate:email-verification] failed:", err.message ?? err);
  process.exit(1);
});
