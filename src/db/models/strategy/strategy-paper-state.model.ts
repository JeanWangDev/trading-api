import { DataTypes, Model } from "sequelize";
import { getSequelize } from "@/db/connection";

export class StrategyPaperState extends Model {
  declare strategyKey: string;
  declare equityUsdt: string;
  declare peakEquityUsdt: string;
  declare positionSide: string | null;
  declare entryPrice: string | null;
  declare positionNotional: string;
  declare lastSignal: string | null;
  declare lastPrice: string | null;
  declare totalReturnPct: string;
  declare maxDrawdownPct: string;
  declare sharpeRatio: string;
  declare winRate: string;
  declare tradeCount: number;
  declare winCount: number;
  declare updateTime: Date;
}

export async function initStrategyPaperStateModel() {
  const sequelize = await getSequelize();
  if (!sequelize || StrategyPaperState.sequelize) return;

  StrategyPaperState.init(
    {
      strategyKey: { type: DataTypes.STRING(32), field: "f_strategy_key", primaryKey: true },
      equityUsdt: { type: DataTypes.DECIMAL(18, 6), field: "f_equity_usdt", allowNull: false, defaultValue: 10000 },
      peakEquityUsdt: { type: DataTypes.DECIMAL(18, 6), field: "f_peak_equity_usdt", allowNull: false, defaultValue: 10000 },
      positionSide: { type: DataTypes.STRING(8), field: "f_position_side", allowNull: true },
      entryPrice: { type: DataTypes.DECIMAL(18, 8), field: "f_entry_price", allowNull: true },
      positionNotional: { type: DataTypes.DECIMAL(18, 6), field: "f_position_notional", allowNull: false, defaultValue: 0 },
      lastSignal: { type: DataTypes.STRING(16), field: "f_last_signal", allowNull: true },
      lastPrice: { type: DataTypes.DECIMAL(18, 8), field: "f_last_price", allowNull: true },
      totalReturnPct: { type: DataTypes.DECIMAL(10, 4), field: "f_total_return_pct", allowNull: false, defaultValue: 0 },
      maxDrawdownPct: { type: DataTypes.DECIMAL(10, 4), field: "f_max_drawdown_pct", allowNull: false, defaultValue: 0 },
      sharpeRatio: { type: DataTypes.DECIMAL(10, 4), field: "f_sharpe_ratio", allowNull: false, defaultValue: 0 },
      winRate: { type: DataTypes.DECIMAL(10, 4), field: "f_win_rate", allowNull: false, defaultValue: 0 },
      tradeCount: { type: DataTypes.INTEGER, field: "f_trade_count", allowNull: false, defaultValue: 0 },
      winCount: { type: DataTypes.INTEGER, field: "f_win_count", allowNull: false, defaultValue: 0 },
      updateTime: { type: DataTypes.DATE, field: "f_update_time", allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      modelName: "StrategyPaperState",
      tableName: "t_strategy_paper_state",
      createdAt: false,
      updatedAt: false,
      freezeTableName: true,
    },
  );
}
