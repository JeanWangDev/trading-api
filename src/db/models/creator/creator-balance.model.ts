import { DataTypes, Model } from "sequelize";
import { getSequelize } from "@/db/connection";

export class CreatorBalance extends Model {
  declare userId: number;
  declare availableUsdt: string;
  declare pendingUsdt: string;
  declare lifetimeEarnedUsdt: string;
  declare updateTime: Date;
}

export async function initCreatorBalanceModel() {
  const sequelize = await getSequelize();
  if (!sequelize || CreatorBalance.sequelize) return;

  CreatorBalance.init(
    {
      userId: { type: DataTypes.BIGINT, field: "f_user_id", primaryKey: true },
      availableUsdt: { type: DataTypes.DECIMAL(18, 6), field: "f_available_usdt", allowNull: false, defaultValue: 0 },
      pendingUsdt: { type: DataTypes.DECIMAL(18, 6), field: "f_pending_usdt", allowNull: false, defaultValue: 0 },
      lifetimeEarnedUsdt: { type: DataTypes.DECIMAL(18, 6), field: "f_lifetime_earned_usdt", allowNull: false, defaultValue: 0 },
      updateTime: { type: DataTypes.DATE, field: "f_update_time", allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      modelName: "CreatorBalance",
      tableName: "t_creator_balance",
      createdAt: false,
      updatedAt: false,
      freezeTableName: true,
    },
  );
}
