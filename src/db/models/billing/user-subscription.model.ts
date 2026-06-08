import { DataTypes, Model } from "sequelize";
import { getSequelize } from "@/db/connection";
import { MembershipPlan } from "./membership-plan.model";
import { PaymentOrder } from "./payment-order.model";
import { User } from "@/db/models/auth/user.model";

export class UserSubscription extends Model {
  declare id: number;
  declare userId: number;
  declare planId: number;
  declare planKey: string;
  declare orderId: number | null;
  declare status: string;
  declare startsAt: Date;
  declare endsAt: Date;
  declare createTime: Date;
  declare updateTime: Date;

  declare plan?: MembershipPlan;
}

export async function initUserSubscriptionModel() {
  const sequelize = await getSequelize();
  if (!sequelize) return;

  UserSubscription.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true, field: "f_id" },
      userId: { type: DataTypes.BIGINT, field: "f_user_id", allowNull: false },
      planId: { type: DataTypes.INTEGER, field: "f_plan_id", allowNull: false },
      planKey: { type: DataTypes.STRING(32), field: "f_plan_key", allowNull: false },
      orderId: { type: DataTypes.BIGINT, field: "f_order_id", allowNull: true },
      status: { type: DataTypes.STRING(16), field: "f_status", allowNull: false, defaultValue: "active" },
      startsAt: { type: DataTypes.DATE, field: "f_starts_at", allowNull: false },
      endsAt: { type: DataTypes.DATE, field: "f_ends_at", allowNull: false },
      createTime: { type: DataTypes.DATE, field: "f_create_time", allowNull: false, defaultValue: DataTypes.NOW },
      updateTime: { type: DataTypes.DATE, field: "f_update_time", allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      modelName: "UserSubscription",
      tableName: "t_user_subscription",
      createdAt: false,
      updatedAt: false,
      freezeTableName: true,
    },
  );

  UserSubscription.belongsTo(MembershipPlan, { foreignKey: "planId", as: "plan" });
  UserSubscription.belongsTo(PaymentOrder, { foreignKey: "orderId", as: "order" });
  UserSubscription.belongsTo(User, { foreignKey: "userId", as: "user" });
}
