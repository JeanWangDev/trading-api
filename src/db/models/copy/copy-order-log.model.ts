import { DataTypes, Model } from "sequelize";
import { getSequelize } from "@/db/connection";

export class CopyOrderLog extends Model {
  declare id: number;
  declare copySubscriptionId: number;
  declare strategyKey: string;
  declare signal: string;
  declare side: string;
  declare symbol: string;
  declare sizeUsdt: string;
  declare exchangeOrderId: string | null;
  declare status: string;
  declare errorMessage: string | null;
  declare createTime: Date;
}

export async function initCopyOrderLogModel() {
  const sequelize = await getSequelize();
  if (!sequelize || CopyOrderLog.sequelize) return;

  CopyOrderLog.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true, field: "f_id" },
      copySubscriptionId: { type: DataTypes.INTEGER, field: "f_copy_subscription_id", allowNull: false },
      strategyKey: { type: DataTypes.STRING(32), field: "f_strategy_key", allowNull: false },
      signal: { type: DataTypes.STRING(16), field: "f_signal", allowNull: false },
      side: { type: DataTypes.STRING(8), field: "f_side", allowNull: false },
      symbol: { type: DataTypes.STRING(32), field: "f_symbol", allowNull: false },
      sizeUsdt: { type: DataTypes.DECIMAL(18, 6), field: "f_size_usdt", allowNull: false },
      exchangeOrderId: { type: DataTypes.STRING(64), field: "f_exchange_order_id", allowNull: true },
      status: { type: DataTypes.STRING(16), field: "f_status", allowNull: false, defaultValue: "pending" },
      errorMessage: { type: DataTypes.STRING(255), field: "f_error_message", allowNull: true },
      createTime: { type: DataTypes.DATE, field: "f_create_time", allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      modelName: "CopyOrderLog",
      tableName: "t_copy_order_log",
      createdAt: false,
      updatedAt: false,
      freezeTableName: true,
    },
  );
}
