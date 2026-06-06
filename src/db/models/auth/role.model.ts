import { DataTypes, Model } from "sequelize";
import { getSequelize } from "@/db/connection";

export class Role extends Model {
  declare id: number;
  declare roleKey: string;
  declare roleName: string;
  declare roleLevel: number;
  declare status: number;
  declare createTime: Date;
  declare updateTime: Date;
}

export async function initRoleModel() {
  const sequelize = await getSequelize();
  if (!sequelize) return;

  Role.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "f_id",
      },
      roleKey: {
        type: DataTypes.STRING(32),
        field: "f_role_key",
        allowNull: false,
        unique: "uniq_role_key",
      },
      roleName: {
        type: DataTypes.STRING(64),
        field: "f_role_name",
        allowNull: false,
      },
      roleLevel: {
        type: DataTypes.TINYINT,
        field: "f_role_level",
        allowNull: false,
        defaultValue: 1,
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
      modelName: "Role",
      tableName: "t_role",
      createdAt: false,
      updatedAt: false,
      freezeTableName: true,
    },
  );
}
