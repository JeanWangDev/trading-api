import { DataTypes, Model } from "sequelize";
import { getSequelize } from "@/db/connection";

export class MembershipPlan extends Model {
  declare id: number;
  declare planKey: string;
  declare name: string;
  declare description: string;
  declare priceUsdt: string;
  declare durationDays: number;
  declare targetRoleKey: string;
  declare chain: string;
  declare asset: string;
  declare sortOrder: number;
  declare status: number;
  declare createTime: Date;
  declare updateTime: Date;
}

export async function initMembershipPlanModel() {
  const sequelize = await getSequelize();
  if (!sequelize) return;

  MembershipPlan.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: "f_id" },
      planKey: { type: DataTypes.STRING(32), field: "f_plan_key", allowNull: false, unique: true },
      name: { type: DataTypes.STRING(64), field: "f_name", allowNull: false },
      description: { type: DataTypes.STRING(255), field: "f_description", allowNull: false, defaultValue: "" },
      priceUsdt: { type: DataTypes.DECIMAL(18, 6), field: "f_price_usdt", allowNull: false },
      durationDays: { type: DataTypes.INTEGER, field: "f_duration_days", allowNull: false },
      targetRoleKey: { type: DataTypes.STRING(32), field: "f_target_role_key", allowNull: false, defaultValue: "vip_user" },
      chain: { type: DataTypes.STRING(16), field: "f_chain", allowNull: false, defaultValue: "TRC20" },
      asset: { type: DataTypes.STRING(16), field: "f_asset", allowNull: false, defaultValue: "USDT" },
      sortOrder: { type: DataTypes.INTEGER, field: "f_sort_order", allowNull: false, defaultValue: 0 },
      status: { type: DataTypes.TINYINT, field: "f_status", allowNull: false, defaultValue: 1 },
      createTime: { type: DataTypes.DATE, field: "f_create_time", allowNull: false, defaultValue: DataTypes.NOW },
      updateTime: { type: DataTypes.DATE, field: "f_update_time", allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      modelName: "MembershipPlan",
      tableName: "t_membership_plan",
      createdAt: false,
      updatedAt: false,
      freezeTableName: true,
    },
  );
}
