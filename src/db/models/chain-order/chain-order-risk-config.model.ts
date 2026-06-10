import { DataTypes, Model } from "sequelize";
import { getSequelize } from "@/db/connection";

export class ChainOrderRiskConfig extends Model {
  declare configKey: string;
  declare riskEnabled: number;
  declare minMarginUsdt: string;
  declare maxMarginUsdt: string;
  declare minLeverage: string;
  declare maxLeverage: string;
  declare maxNotionalUsdt: string;
  declare maxSlippagePercent: string;
  declare dailyOrderLimit: number;
  declare allowedChains: string;
  declare allowedProtocols: string;
  declare updatedBy: number | null;
  declare createTime: Date;
  declare updateTime: Date;
}

export async function initChainOrderRiskConfigModel() {
  const sequelize = await getSequelize();
  if (!sequelize || ChainOrderRiskConfig.sequelize) return;

  ChainOrderRiskConfig.init(
    {
      configKey: {
        type: DataTypes.STRING(32),
        field: "f_config_key",
        primaryKey: true,
        allowNull: false,
      },
      riskEnabled: {
        type: DataTypes.TINYINT,
        field: "f_risk_enabled",
        allowNull: false,
        defaultValue: 1,
      },
      minMarginUsdt: {
        type: DataTypes.DECIMAL(18, 6),
        field: "f_min_margin_usdt",
        allowNull: false,
        defaultValue: 1,
      },
      maxMarginUsdt: {
        type: DataTypes.DECIMAL(18, 6),
        field: "f_max_margin_usdt",
        allowNull: false,
        defaultValue: 100,
      },
      minLeverage: {
        type: DataTypes.DECIMAL(18, 6),
        field: "f_min_leverage",
        allowNull: false,
        defaultValue: 1,
      },
      maxLeverage: {
        type: DataTypes.DECIMAL(18, 6),
        field: "f_max_leverage",
        allowNull: false,
        defaultValue: 10,
      },
      maxNotionalUsdt: {
        type: DataTypes.DECIMAL(18, 6),
        field: "f_max_notional_usdt",
        allowNull: false,
        defaultValue: 500,
      },
      maxSlippagePercent: {
        type: DataTypes.DECIMAL(18, 6),
        field: "f_max_slippage_percent",
        allowNull: false,
        defaultValue: 2,
      },
      dailyOrderLimit: {
        type: DataTypes.INTEGER,
        field: "f_daily_order_limit",
        allowNull: false,
        defaultValue: 50,
      },
      allowedChains: {
        type: DataTypes.STRING(255),
        field: "f_allowed_chains",
        allowNull: false,
        defaultValue: "bsc-testnet",
      },
      allowedProtocols: {
        type: DataTypes.STRING(255),
        field: "f_allowed_protocols",
        allowNull: false,
        defaultValue: "mock-perp",
      },
      updatedBy: {
        type: DataTypes.BIGINT,
        field: "f_updated_by",
        allowNull: true,
      },
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
      modelName: "ChainOrderRiskConfig",
      tableName: "t_chain_order_risk_config",
      createdAt: false,
      updatedAt: false,
      freezeTableName: true,
    },
  );
}
