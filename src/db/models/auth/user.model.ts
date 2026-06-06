import { DataTypes, Model } from "sequelize";
import { getSequelize } from "@/db/connection";
import { Role } from "./role.model";

export class User extends Model {
  declare id: number;
  declare email: string;
  declare nickname: string;
  declare passwordHash: string;
  declare roleId: number;
  declare status: number;
  declare lastLoginTime: Date | null;
  declare createTime: Date;
  declare updateTime: Date;

  declare role?: Role;
}

export async function initUserModel() {
  const sequelize = await getSequelize();
  if (!sequelize) return;

  User.init(
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        field: "f_id",
      },
      email: {
        type: DataTypes.STRING(191),
        field: "f_email",
        allowNull: false,
        unique: "uniq_user_email",
      },
      nickname: {
        type: DataTypes.STRING(64),
        field: "f_nickname",
        allowNull: false,
        defaultValue: "",
      },
      passwordHash: {
        type: DataTypes.STRING(255),
        field: "f_password_hash",
        allowNull: false,
      },
      roleId: {
        type: DataTypes.INTEGER,
        field: "f_role_id",
        allowNull: false,
      },
      status: {
        type: DataTypes.TINYINT,
        field: "f_status",
        allowNull: false,
        defaultValue: 1,
      },
      lastLoginTime: {
        type: DataTypes.DATE,
        field: "f_last_login_time",
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
      modelName: "User",
      tableName: "t_user",
      createdAt: false,
      updatedAt: false,
      freezeTableName: true,
    },
  );

  User.belongsTo(Role, { foreignKey: "roleId", as: "role" });
}
