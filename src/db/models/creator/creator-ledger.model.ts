import { DataTypes, Model } from "sequelize";
import { getSequelize } from "@/db/connection";

export class CreatorLedger extends Model {
  declare id: number;
  declare userId: number;
  declare type: string;
  declare amountUsdt: string;
  declare refFollowId: number | null;
  declare refWithdrawalId: number | null;
  declare note: string;
  declare createTime: Date;
}

export async function initCreatorLedgerModel() {
  const sequelize = await getSequelize();
  if (!sequelize || CreatorLedger.sequelize) return;

  CreatorLedger.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true, field: "f_id" },
      userId: { type: DataTypes.BIGINT, field: "f_user_id", allowNull: false },
      type: { type: DataTypes.STRING(32), field: "f_type", allowNull: false },
      amountUsdt: { type: DataTypes.DECIMAL(18, 6), field: "f_amount_usdt", allowNull: false },
      refFollowId: { type: DataTypes.INTEGER, field: "f_ref_follow_id", allowNull: true },
      refWithdrawalId: { type: DataTypes.BIGINT, field: "f_ref_withdrawal_id", allowNull: true },
      note: { type: DataTypes.STRING(255), field: "f_note", allowNull: false, defaultValue: "" },
      createTime: { type: DataTypes.DATE, field: "f_create_time", allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      modelName: "CreatorLedger",
      tableName: "t_creator_ledger",
      createdAt: false,
      updatedAt: false,
      freezeTableName: true,
    },
  );
}
