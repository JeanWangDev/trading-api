import { DataTypes, Model } from "sequelize";
import { getSequelize } from "@/db/connection";

export class CreatorWithdrawal extends Model {
  declare id: number;
  declare userId: number;
  declare amountUsdt: string;
  declare chain: string;
  declare address: string;
  declare status: string;
  declare txHash: string | null;
  declare createTime: Date;
  declare updateTime: Date;
}

export async function initCreatorWithdrawalModel() {
  const sequelize = await getSequelize();
  if (!sequelize || CreatorWithdrawal.sequelize) return;

  CreatorWithdrawal.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true, field: "f_id" },
      userId: { type: DataTypes.BIGINT, field: "f_user_id", allowNull: false },
      amountUsdt: { type: DataTypes.DECIMAL(18, 6), field: "f_amount_usdt", allowNull: false },
      chain: { type: DataTypes.STRING(16), field: "f_chain", allowNull: false, defaultValue: "TRC20" },
      address: { type: DataTypes.STRING(128), field: "f_address", allowNull: false },
      status: { type: DataTypes.STRING(16), field: "f_status", allowNull: false, defaultValue: "pending" },
      txHash: { type: DataTypes.STRING(128), field: "f_tx_hash", allowNull: true },
      createTime: { type: DataTypes.DATE, field: "f_create_time", allowNull: false, defaultValue: DataTypes.NOW },
      updateTime: { type: DataTypes.DATE, field: "f_update_time", allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      modelName: "CreatorWithdrawal",
      tableName: "t_creator_withdrawal",
      createdAt: false,
      updatedAt: false,
      freezeTableName: true,
    },
  );
}
