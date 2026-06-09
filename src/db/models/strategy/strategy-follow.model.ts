import { DataTypes, Model } from "sequelize";
import { getSequelize } from "@/db/connection";

export class StrategyFollow extends Model {
  declare id: number;
  declare strategyId: number;
  declare strategyKey: string;
  declare followerUserId: number;
  declare subscriptionId: number | null;
  declare orderId: number | null;
  declare feeUsdt: string;
  declare platformFeeUsdt: string;
  declare creatorFeeUsdt: string;
  declare status: number;
  declare createTime: Date;
  declare updateTime: Date;
}

export async function initStrategyFollowModel() {
  const sequelize = await getSequelize();
  if (!sequelize || StrategyFollow.sequelize) return;

  StrategyFollow.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: "f_id" },
      strategyId: { type: DataTypes.INTEGER, field: "f_strategy_id", allowNull: false },
      strategyKey: { type: DataTypes.STRING(32), field: "f_strategy_key", allowNull: false },
      followerUserId: { type: DataTypes.BIGINT, field: "f_follower_user_id", allowNull: false },
      subscriptionId: { type: DataTypes.INTEGER, field: "f_subscription_id", allowNull: true },
      orderId: { type: DataTypes.INTEGER, field: "f_order_id", allowNull: true },
      feeUsdt: { type: DataTypes.DECIMAL(18, 6), field: "f_fee_usdt", allowNull: false, defaultValue: 0 },
      platformFeeUsdt: {
        type: DataTypes.DECIMAL(18, 6),
        field: "f_platform_fee_usdt",
        allowNull: false,
        defaultValue: 0,
      },
      creatorFeeUsdt: {
        type: DataTypes.DECIMAL(18, 6),
        field: "f_creator_fee_usdt",
        allowNull: false,
        defaultValue: 0,
      },
      status: { type: DataTypes.TINYINT, field: "f_status", allowNull: false, defaultValue: 1 },
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
      modelName: "StrategyFollow",
      tableName: "t_strategy_follow",
      createdAt: false,
      updatedAt: false,
      freezeTableName: true,
    },
  );
}
