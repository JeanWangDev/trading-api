import { DataTypes, Model } from "sequelize";
import { getSequelize } from "@/db/connection";

export class ExchangeConnection extends Model {
  declare id: number;
  declare userId: number;
  declare exchange: string;
  declare label: string;
  declare apiKeyEnc: string;
  declare secretEnc: string;
  declare passphraseEnc: string;
  declare permissions: string;
  declare status: number;
  declare createTime: Date;
  declare updateTime: Date;
}

export async function initExchangeConnectionModel() {
  const sequelize = await getSequelize();
  if (!sequelize || ExchangeConnection.sequelize) return;

  ExchangeConnection.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: "f_id" },
      userId: { type: DataTypes.BIGINT, field: "f_user_id", allowNull: false },
      exchange: { type: DataTypes.STRING(16), field: "f_exchange", allowNull: false, defaultValue: "okx" },
      label: { type: DataTypes.STRING(64), field: "f_label", allowNull: false, defaultValue: "" },
      apiKeyEnc: { type: DataTypes.TEXT, field: "f_api_key_enc", allowNull: false },
      secretEnc: { type: DataTypes.TEXT, field: "f_secret_enc", allowNull: false },
      passphraseEnc: { type: DataTypes.TEXT, field: "f_passphrase_enc", allowNull: false },
      permissions: { type: DataTypes.STRING(64), field: "f_permissions", allowNull: false, defaultValue: "trade" },
      status: { type: DataTypes.TINYINT, field: "f_status", allowNull: false, defaultValue: 1 },
      createTime: { type: DataTypes.DATE, field: "f_create_time", allowNull: false, defaultValue: DataTypes.NOW },
      updateTime: { type: DataTypes.DATE, field: "f_update_time", allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      modelName: "ExchangeConnection",
      tableName: "t_exchange_connection",
      createdAt: false,
      updatedAt: false,
      freezeTableName: true,
    },
  );
}
