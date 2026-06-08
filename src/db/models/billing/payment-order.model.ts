import { DataTypes, Model } from "sequelize";
import { getSequelize } from "@/db/connection";
import { MembershipPlan } from "./membership-plan.model";
import { User } from "@/db/models/auth/user.model";

export class PaymentOrder extends Model {
  declare id: number;
  declare orderNo: string;
  declare userId: number;
  declare planId: number;
  declare planKey: string;
  declare chain: string;
  declare asset: string;
  declare amountUsdt: string;
  declare depositAddress: string;
  declare addressIndex: number | null;
  declare status: string;
  declare txHash: string | null;
  declare paidAmountUsdt: string | null;
  declare expireTime: Date;
  declare paidTime: Date | null;
  declare createTime: Date;
  declare updateTime: Date;

  declare plan?: MembershipPlan;
  declare user?: User;
}

export async function initPaymentOrderModel() {
  const sequelize = await getSequelize();
  if (!sequelize) return;

  PaymentOrder.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true, field: "f_id" },
      orderNo: { type: DataTypes.STRING(32), field: "f_order_no", allowNull: false, unique: true },
      userId: { type: DataTypes.BIGINT, field: "f_user_id", allowNull: false },
      planId: { type: DataTypes.INTEGER, field: "f_plan_id", allowNull: false },
      planKey: { type: DataTypes.STRING(32), field: "f_plan_key", allowNull: false },
      chain: { type: DataTypes.STRING(16), field: "f_chain", allowNull: false },
      asset: { type: DataTypes.STRING(16), field: "f_asset", allowNull: false },
      amountUsdt: { type: DataTypes.DECIMAL(18, 6), field: "f_amount_usdt", allowNull: false },
      depositAddress: { type: DataTypes.STRING(64), field: "f_deposit_address", allowNull: false },
      addressIndex: { type: DataTypes.INTEGER, field: "f_address_index", allowNull: true },
      status: { type: DataTypes.STRING(16), field: "f_status", allowNull: false, defaultValue: "pending" },
      txHash: { type: DataTypes.STRING(128), field: "f_tx_hash", allowNull: true },
      paidAmountUsdt: { type: DataTypes.DECIMAL(18, 6), field: "f_paid_amount_usdt", allowNull: true },
      expireTime: { type: DataTypes.DATE, field: "f_expire_time", allowNull: false },
      paidTime: { type: DataTypes.DATE, field: "f_paid_time", allowNull: true },
      createTime: { type: DataTypes.DATE, field: "f_create_time", allowNull: false, defaultValue: DataTypes.NOW },
      updateTime: { type: DataTypes.DATE, field: "f_update_time", allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      modelName: "PaymentOrder",
      tableName: "t_payment_order",
      createdAt: false,
      updatedAt: false,
      freezeTableName: true,
    },
  );

  PaymentOrder.belongsTo(MembershipPlan, { foreignKey: "planId", as: "plan" });
  PaymentOrder.belongsTo(User, { foreignKey: "userId", as: "user" });
}
