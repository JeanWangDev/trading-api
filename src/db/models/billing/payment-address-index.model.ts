import { DataTypes, Model } from "sequelize";
import { getSequelize } from "@/db/connection";

export class PaymentAddressIndex extends Model {
  declare id: number;
  declare nextIndex: number;
  declare updateTime: Date;
}

export async function initPaymentAddressIndexModel() {
  const sequelize = await getSequelize();
  if (!sequelize) return;

  PaymentAddressIndex.init(
    {
      id: { type: DataTypes.TINYINT, primaryKey: true, field: "f_id", defaultValue: 1 },
      nextIndex: { type: DataTypes.INTEGER, field: "f_next_index", allowNull: false, defaultValue: 0 },
      updateTime: { type: DataTypes.DATE, field: "f_update_time", allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      modelName: "PaymentAddressIndex",
      tableName: "t_payment_address_index",
      createdAt: false,
      updatedAt: false,
      freezeTableName: true,
    },
  );
}
