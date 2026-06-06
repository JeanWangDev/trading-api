import { DataTypes, Model } from "sequelize";
import { getSequelize } from "@/db/connection";

export class TradingSymbol extends Model {
  declare id: number;
  declare baseAsset: string;
  declare symbol: string;
  declare exchange: string;
  declare displayName: string;
  declare sortOrder: number;
  declare isDefault: number;
  declare accessTier: number;
  declare status: number;
  declare createTime: Date;
  declare updateTime: Date;
}

export async function initTradingSymbolModel() {
  const sequelize = await getSequelize();
  if (!sequelize) return;

  TradingSymbol.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "f_id",
      },
      baseAsset: {
        type: DataTypes.STRING(16),
        field: "f_base_asset",
        allowNull: false,
      },
      symbol: {
        type: DataTypes.STRING(32),
        field: "f_symbol",
        allowNull: false,
      },
      exchange: {
        type: DataTypes.STRING(32),
        field: "f_exchange",
        allowNull: false,
        defaultValue: "binance",
      },
      displayName: {
        type: DataTypes.STRING(64),
        field: "f_display_name",
        allowNull: false,
        defaultValue: "",
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        field: "f_sort_order",
        allowNull: false,
        defaultValue: 0,
      },
      isDefault: {
        type: DataTypes.TINYINT,
        field: "f_is_default",
        allowNull: false,
        defaultValue: 0,
      },
      accessTier: {
        type: DataTypes.TINYINT,
        field: "f_access_tier",
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: DataTypes.TINYINT,
        field: "f_status",
        allowNull: false,
        defaultValue: 1,
      },
      createTime: {
        type: DataTypes.DATE,
        field: "f_create_time",
      },
      updateTime: {
        type: DataTypes.DATE,
        field: "f_update_time",
      },
    },
    {
      sequelize,
      tableName: "t_trading_symbol",
      timestamps: false,
    },
  );
}
