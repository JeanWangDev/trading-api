import { DataTypes, Model } from "sequelize";
import { getSequelize } from "@/db/connection";

export class UserRole extends Model {
  declare id: number;
  declare userId: number;
  declare roleId: number;
  declare isPrimary: number;
  declare createTime: Date;
}

export async function initUserRoleModel() {
  const sequelize = await getSequelize();
  if (!sequelize) return;

  UserRole.init(
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        field: "f_id",
      },
      userId: {
        type: DataTypes.BIGINT,
        field: "f_user_id",
        allowNull: false,
      },
      roleId: {
        type: DataTypes.INTEGER,
        field: "f_role_id",
        allowNull: false,
      },
      isPrimary: {
        type: DataTypes.TINYINT,
        field: "f_is_primary",
        allowNull: false,
        defaultValue: 1,
      },
      createTime: {
        type: DataTypes.DATE,
        field: "f_create_time",
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "UserRole",
      tableName: "t_user_role",
      createdAt: false,
      updatedAt: false,
      freezeTableName: true,
    },
  );
}
