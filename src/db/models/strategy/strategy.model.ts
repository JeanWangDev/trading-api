import { DataTypes, Model } from "sequelize";
import { getSequelize } from "@/db/connection";

export class Strategy extends Model {
  declare id: number;
  declare userId: number;
  declare strategyKey: string;
  declare planKey: string;
  declare name: string;
  declare summary: string;
  declare description: string;
  declare symbol: string;
  declare interval: string;
  declare templateId: string | null;
  declare tags: string;
  declare sortOrder: number;
  declare status: number;
  declare visibility: number;
  declare followFeeUsdt: string;
  declare platformFeeRate: string;
  declare sourceStrategyKey: string | null;
  declare followerCount: number;
  declare createTime: Date;
  declare updateTime: Date;
}

export async function initStrategyModel() {
  const sequelize = await getSequelize();
  if (!sequelize || Strategy.sequelize) return;

  Strategy.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: "f_id" },
      userId: { type: DataTypes.BIGINT, field: "f_user_id", allowNull: false, defaultValue: 0 },
      strategyKey: {
        type: DataTypes.STRING(32),
        field: "f_strategy_key",
        allowNull: false,
        unique: true,
      },
      planKey: { type: DataTypes.STRING(32), field: "f_plan_key", allowNull: false, unique: true },
      name: { type: DataTypes.STRING(64), field: "f_name", allowNull: false },
      summary: { type: DataTypes.STRING(255), field: "f_summary", allowNull: false, defaultValue: "" },
      description: { type: DataTypes.TEXT, field: "f_description", allowNull: false },
      symbol: { type: DataTypes.STRING(32), field: "f_symbol", allowNull: false, defaultValue: "BTCUSDT" },
      interval: { type: DataTypes.STRING(16), field: "f_interval", allowNull: false, defaultValue: "1h" },
      templateId: { type: DataTypes.STRING(64), field: "f_template_id", allowNull: true },
      tags: { type: DataTypes.STRING(255), field: "f_tags", allowNull: false, defaultValue: "" },
      sortOrder: { type: DataTypes.INTEGER, field: "f_sort_order", allowNull: false, defaultValue: 0 },
      status: { type: DataTypes.TINYINT, field: "f_status", allowNull: false, defaultValue: 1 },
      visibility: { type: DataTypes.TINYINT, field: "f_visibility", allowNull: false, defaultValue: 1 },
      followFeeUsdt: {
        type: DataTypes.DECIMAL(18, 6),
        field: "f_follow_fee_usdt",
        allowNull: false,
        defaultValue: 0,
      },
      platformFeeRate: {
        type: DataTypes.DECIMAL(5, 2),
        field: "f_platform_fee_rate",
        allowNull: false,
        defaultValue: 20,
      },
      sourceStrategyKey: {
        type: DataTypes.STRING(32),
        field: "f_source_strategy_key",
        allowNull: true,
      },
      followerCount: { type: DataTypes.INTEGER, field: "f_follower_count", allowNull: false, defaultValue: 0 },
      createTime: {
        type: DataTypes.DATE,
        field: "f_create_time",
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updateTime: {
        type: DataTypes.DATE,
        field: "f_update_time",
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "Strategy",
      tableName: "t_strategy",
      createdAt: false,
      updatedAt: false,
      freezeTableName: true,
    },
  );
}
