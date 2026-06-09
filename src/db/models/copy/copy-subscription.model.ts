import { DataTypes, Model } from "sequelize";
import { getSequelize } from "@/db/connection";

export class CopySubscription extends Model {
  declare id: number;
  declare userId: number;
  declare strategyKey: string;
  declare exchangeConnectionId: number;
  declare tradeMode: string;
  declare orderSizeUsdt: string;
  declare status: number;
  declare lastSignal: string | null;
  declare createTime: Date;
  declare updateTime: Date;
}

export async function initCopySubscriptionModel() {
  const sequelize = await getSequelize();
  if (!sequelize || CopySubscription.sequelize) return;

  CopySubscription.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: "f_id" },
      userId: { type: DataTypes.BIGINT, field: "f_user_id", allowNull: false },
      strategyKey: { type: DataTypes.STRING(32), field: "f_strategy_key", allowNull: false },
      exchangeConnectionId: { type: DataTypes.INTEGER, field: "f_exchange_connection_id", allowNull: false },
      tradeMode: { type: DataTypes.STRING(16), field: "f_trade_mode", allowNull: false, defaultValue: "live" },
      orderSizeUsdt: { type: DataTypes.DECIMAL(18, 6), field: "f_order_size_usdt", allowNull: false, defaultValue: 100 },
      status: { type: DataTypes.TINYINT, field: "f_status", allowNull: false, defaultValue: 1 },
      lastSignal: { type: DataTypes.STRING(16), field: "f_last_signal", allowNull: true },
      createTime: { type: DataTypes.DATE, field: "f_create_time", allowNull: false, defaultValue: DataTypes.NOW },
      updateTime: { type: DataTypes.DATE, field: "f_update_time", allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      modelName: "CopySubscription",
      tableName: "t_copy_subscription",
      createdAt: false,
      updatedAt: false,
      freezeTableName: true,
    },
  );
}
