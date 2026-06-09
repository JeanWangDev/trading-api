import { DataTypes, Model } from "sequelize";
import { getSequelize } from "@/db/connection";

export class StrategyPaperTrade extends Model {
  declare id: number;
  declare strategyKey: string;
  declare side: string;
  declare entryPrice: string;
  declare exitPrice: string;
  declare notionalUsdt: string;
  declare pnlUsdt: string;
  declare pnlPct: string;
  declare openedAt: Date;
  declare closedAt: Date;
}

export async function initStrategyPaperTradeModel() {
  const sequelize = await getSequelize();
  if (!sequelize || StrategyPaperTrade.sequelize) return;

  StrategyPaperTrade.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true, field: "f_id" },
      strategyKey: { type: DataTypes.STRING(32), field: "f_strategy_key", allowNull: false },
      side: { type: DataTypes.STRING(8), field: "f_side", allowNull: false },
      entryPrice: { type: DataTypes.DECIMAL(18, 8), field: "f_entry_price", allowNull: false },
      exitPrice: { type: DataTypes.DECIMAL(18, 8), field: "f_exit_price", allowNull: false },
      notionalUsdt: { type: DataTypes.DECIMAL(18, 6), field: "f_notional_usdt", allowNull: false },
      pnlUsdt: { type: DataTypes.DECIMAL(18, 6), field: "f_pnl_usdt", allowNull: false },
      pnlPct: { type: DataTypes.DECIMAL(10, 4), field: "f_pnl_pct", allowNull: false },
      openedAt: { type: DataTypes.DATE, field: "f_opened_at", allowNull: false },
      closedAt: { type: DataTypes.DATE, field: "f_closed_at", allowNull: false },
    },
    {
      sequelize,
      modelName: "StrategyPaperTrade",
      tableName: "t_strategy_paper_trade",
      createdAt: false,
      updatedAt: false,
      freezeTableName: true,
    },
  );
}
