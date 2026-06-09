import { DataTypes, Model } from "sequelize";
import { getSequelize } from "@/db/connection";

export class ChainOrder extends Model {
  declare id: number;
  declare orderId: string;
  declare userId: number;
  declare walletAddress: string;
  declare chain: string;
  declare chainId: string;
  declare protocol: string;
  declare contractAddress: string | null;
  declare txHash: string;
  declare txStatus: string;
  declare receiptStatus: string | null;
  declare blockNumber: string | null;
  declare symbol: string;
  declare pairLabel: string;
  declare marketType: string;
  declare side: string;
  declare orderType: string;
  declare marginUsdt: string;
  declare leverage: string;
  declare leverageX100: number | null;
  declare notionalUsdt: string | null;
  declare slippagePercent: string | null;
  declare entryPrice: string | null;
  declare exitPrice: string | null;
  declare pnlUsdt: string | null;
  declare pnlPercent: string | null;
  declare strategyId: string | null;
  declare strategyName: string | null;
  declare agentId: string | null;
  declare agentName: string | null;
  declare signalId: string | null;
  declare source: string;
  declare rawOrderJson: unknown | null;
  declare rawReceiptJson: unknown | null;
  declare createTime: Date;
  declare updateTime: Date;
}

export async function initChainOrderModel() {
  const sequelize = await getSequelize();
  if (!sequelize) return;

  ChainOrder.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true, field: "f_id" },
      orderId: {
        type: DataTypes.STRING(64),
        field: "f_order_id",
        allowNull: false,
        unique: "uniq_chain_order_id",
      },
      userId: { type: DataTypes.BIGINT, field: "f_user_id", allowNull: false },
      walletAddress: {
        type: DataTypes.STRING(64),
        field: "f_wallet_address",
        allowNull: false,
      },
      chain: {
        type: DataTypes.STRING(32),
        field: "f_chain",
        allowNull: false,
        defaultValue: "bsc-testnet",
      },
      chainId: {
        type: DataTypes.STRING(16),
        field: "f_chain_id",
        allowNull: false,
        defaultValue: "0x61",
      },
      protocol: {
        type: DataTypes.STRING(64),
        field: "f_protocol",
        allowNull: false,
        defaultValue: "mock-perp",
      },
      contractAddress: {
        type: DataTypes.STRING(64),
        field: "f_contract_address",
        allowNull: true,
      },
      txHash: {
        type: DataTypes.STRING(128),
        field: "f_tx_hash",
        allowNull: false,
        unique: "uniq_chain_order_tx_hash",
      },
      txStatus: {
        type: DataTypes.STRING(16),
        field: "f_tx_status",
        allowNull: false,
        defaultValue: "submitted",
      },
      receiptStatus: {
        type: DataTypes.STRING(8),
        field: "f_receipt_status",
        allowNull: true,
      },
      blockNumber: {
        type: DataTypes.STRING(32),
        field: "f_block_number",
        allowNull: true,
      },
      symbol: { type: DataTypes.STRING(32), field: "f_symbol", allowNull: false },
      pairLabel: {
        type: DataTypes.STRING(96),
        field: "f_pair_label",
        allowNull: false,
        defaultValue: "",
      },
      marketType: {
        type: DataTypes.STRING(16),
        field: "f_market_type",
        allowNull: false,
        defaultValue: "perp",
      },
      side: { type: DataTypes.STRING(8), field: "f_side", allowNull: false },
      orderType: {
        type: DataTypes.STRING(16),
        field: "f_order_type",
        allowNull: false,
        defaultValue: "market",
      },
      marginUsdt: {
        type: DataTypes.DECIMAL(30, 10),
        field: "f_margin_usdt",
        allowNull: false,
      },
      leverage: {
        type: DataTypes.DECIMAL(18, 6),
        field: "f_leverage",
        allowNull: false,
      },
      leverageX100: {
        type: DataTypes.INTEGER,
        field: "f_leverage_x100",
        allowNull: true,
      },
      notionalUsdt: {
        type: DataTypes.DECIMAL(30, 10),
        field: "f_notional_usdt",
        allowNull: true,
      },
      slippagePercent: {
        type: DataTypes.DECIMAL(18, 8),
        field: "f_slippage_percent",
        allowNull: true,
      },
      entryPrice: {
        type: DataTypes.DECIMAL(30, 10),
        field: "f_entry_price",
        allowNull: true,
      },
      exitPrice: {
        type: DataTypes.DECIMAL(30, 10),
        field: "f_exit_price",
        allowNull: true,
      },
      pnlUsdt: {
        type: DataTypes.DECIMAL(30, 10),
        field: "f_pnl_usdt",
        allowNull: true,
      },
      pnlPercent: {
        type: DataTypes.DECIMAL(18, 8),
        field: "f_pnl_percent",
        allowNull: true,
      },
      strategyId: {
        type: DataTypes.STRING(64),
        field: "f_strategy_id",
        allowNull: true,
      },
      strategyName: {
        type: DataTypes.STRING(128),
        field: "f_strategy_name",
        allowNull: true,
      },
      agentId: { type: DataTypes.STRING(64), field: "f_agent_id", allowNull: true },
      agentName: {
        type: DataTypes.STRING(128),
        field: "f_agent_name",
        allowNull: true,
      },
      signalId: { type: DataTypes.STRING(64), field: "f_signal_id", allowNull: true },
      source: {
        type: DataTypes.STRING(32),
        field: "f_source",
        allowNull: false,
        defaultValue: "web",
      },
      rawOrderJson: { type: DataTypes.JSON, field: "f_raw_order_json", allowNull: true },
      rawReceiptJson: {
        type: DataTypes.JSON,
        field: "f_raw_receipt_json",
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
      modelName: "ChainOrder",
      tableName: "t_chain_order",
      createdAt: false,
      updatedAt: false,
      freezeTableName: true,
    },
  );
}
