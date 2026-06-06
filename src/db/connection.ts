/**
 * Sequelize 连接单例；配置来自 @/config 的 db 段（.env 中的 DB_*）
 */
import { Sequelize } from "sequelize";
import { config } from "@/config";

/** 建连参数（与 config.db 一致，供 getInstance 使用） */
export type DbConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl?: boolean;
};

class DBConnection {
  private static instance: Sequelize | null = null;
  private static initialized = false;
  private static initializationPromise: Promise<void> | null = null;

  public static async initialize() {
    if (this.initialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = Promise.resolve().then(() => {
      this.initialized = true;
    });

    return this.initializationPromise;
  }

  public static async getInstance(dbConfig: DbConfig): Promise<Sequelize> {
    if (!this.initialized) {
      throw new Error("DBConnection not initialized. Call initialize() first");
    }

    if (!DBConnection.instance) {
      DBConnection.instance = new Sequelize(
        dbConfig.database,
        dbConfig.user,
        dbConfig.password,
        {
          host: dbConfig.host,
          dialect: "mysql",
          port: dbConfig.port,
          logging: config.isDev ? console.log : false,
          pool: {
            max: 10,
            min: 0,
            acquire: 30_000,
            idle: 10_000,
          },
          dialectOptions: {
            charset: "utf8mb4",
            ...(dbConfig.ssl
              ? {
                  ssl: {
                    minVersion: "TLSv1.2",
                    rejectUnauthorized: true,
                  },
                }
              : {}),
          },
          timezone: "+00:00",
        },
      );
    }

    await DBConnection.instance.authenticate();
    return DBConnection.instance;
  }

  public static async getAsyncInstance(dbConfig: DbConfig): Promise<Sequelize> {
    if (!this.initialized) {
      if (this.initializationPromise) {
        await this.initializationPromise;
      } else {
        await this.initialize();
      }
    }

    return this.getInstance(dbConfig);
  }

  public static async close(): Promise<void> {
    if (this.instance) {
      await this.instance.close();
      DBConnection.instance = null;
      this.initialized = false;
      this.initializationPromise = null;
    }
  }
}

export async function initDatabase() {
  if (!config.db.enabled) {
    console.warn("[db] DB_ENABLED=false — skipping database initialization");
    return null;
  }

  await DBConnection.initialize();
  const sequelize = await DBConnection.getAsyncInstance(config.db);
  await sequelize.authenticate();
  return sequelize;
}

let dbInstance: Sequelize | null = null;

export async function getSequelize(): Promise<Sequelize | null> {
  if (!config.db.enabled) {
    return null;
  }

  if (!dbInstance) {
    dbInstance = await DBConnection.getAsyncInstance(config.db);
  }

  return dbInstance;
}

export { DBConnection };
