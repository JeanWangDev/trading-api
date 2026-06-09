/**
 * 将源库 schema + 数据同步到测试库（一次性脚本）
 * 用法: yarn tsx scripts/db-sync-to-test.ts
 */
import mysql from "mysql2/promise";

const SRC = {
  host: process.env.SRC_DB_HOST ?? "gateway01.ap-southeast-1.prod.aws.tidbcloud.com",
  port: Number(process.env.SRC_DB_PORT ?? 4000),
  user: process.env.SRC_DB_USER ?? "",
  password: process.env.SRC_DB_PASSWORD ?? "",
  database: process.env.SRC_DB_NAME ?? "trading-alpha",
  ssl: { minVersion: "TLSv1.2" as const, rejectUnauthorized: true },
};

const TGT = {
  host: process.env.TGT_DB_HOST ?? "",
  port: Number(process.env.TGT_DB_PORT ?? 4000),
  user: process.env.TGT_DB_USER ?? "",
  password: process.env.TGT_DB_PASSWORD ?? "",
  database: process.env.TGT_DB_NAME ?? "trading-alpha-test",
  ssl: { minVersion: "TLSv1.2" as const, rejectUnauthorized: true },
  multipleStatements: true,
};

type ColumnMeta = { name: string; dataType: string };

async function getColumns(conn: mysql.Connection, schema: string, table: string) {
  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    `SELECT column_name AS name, data_type AS dataType
     FROM information_schema.columns
     WHERE table_schema = ? AND table_name = ?
     ORDER BY ordinal_position`,
    [schema, table],
  );
  return rows.map((r) => ({ name: r.name as string, dataType: (r.dataType as string).toLowerCase() }));
}

function serializeValue(dataType: string, value: unknown): unknown {
  if (value === undefined) return null;
  if (value === null) return null;
  if (dataType === "json" && (typeof value === "object" || Array.isArray(value))) {
    return JSON.stringify(value);
  }
  if (Buffer.isBuffer(value)) return value;
  return value;
}

async function main() {
  if (!SRC.user || !TGT.host || !TGT.user) {
    throw new Error("请设置 SRC_DB_* 与 TGT_DB_* 环境变量");
  }

  const admin = await mysql.createConnection({
    host: TGT.host,
    port: TGT.port,
    user: TGT.user,
    password: TGT.password,
    ssl: TGT.ssl,
    multipleStatements: true,
  });
  await admin.query(
    `CREATE DATABASE IF NOT EXISTS \`${TGT.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await admin.end();
  console.log(`[sync] target database ready: ${TGT.database}`);

  const src = await mysql.createConnection({ ...SRC, multipleStatements: true });
  const tgt = await mysql.createConnection(TGT);

  const [tables] = await src.query<mysql.RowDataPacket[]>(
    `SELECT table_name AS tableName FROM information_schema.tables
     WHERE table_schema = ? ORDER BY table_name`,
    [SRC.database],
  );

  console.log(`[sync] source tables: ${tables.length}`);
  await tgt.query("SET FOREIGN_KEY_CHECKS=0");

  for (const { tableName } of tables) {
    const [createRows] = await src.query<mysql.RowDataPacket[]>(
      `SHOW CREATE TABLE \`${tableName}\``,
    );
    const ddl = Object.values(createRows[0]).find(
      (v) => typeof v === "string" && v.startsWith("CREATE"),
    ) as string;

    await tgt.query(`DROP TABLE IF EXISTS \`${tableName}\``);
    await tgt.query(ddl);

    const columns = await getColumns(src, SRC.database, tableName);
    const colNames = columns.map((c) => c.name);

    const [rows] = await src.query<mysql.RowDataPacket[]>(`SELECT * FROM \`${tableName}\``);
    if (rows.length === 0) {
      console.log(`  ${tableName}: schema only`);
      continue;
    }

    const batch = 100;
    for (let i = 0; i < rows.length; i += batch) {
      const chunk = rows.slice(i, i + batch);
      const placeholders = chunk.map(() => `(${colNames.map(() => "?").join(",")})`).join(",");
      const values = chunk.flatMap((row) =>
        columns.map((col) => serializeValue(col.dataType, row[col.name])),
      );
      await tgt.query(
        `INSERT INTO \`${tableName}\` (${colNames.map((c) => `\`${c}\``).join(",")}) VALUES ${placeholders}`,
        values,
      );
    }
    console.log(`  ${tableName}: ${rows.length} rows`);
  }

  await tgt.query("SET FOREIGN_KEY_CHECKS=1");
  await src.end();
  await tgt.end();
  console.log("[sync] done");
}

main().catch((err) => {
  console.error("[sync] failed", err);
  process.exit(1);
});
