import { DataTypes, Model } from "sequelize";
import { getSequelize } from "@/db/connection";

export class UserPasswordHistory extends Model {
  declare id: number;
  declare userId: number;
  declare passwordHash: string;
  declare reason: string;
  declare createTime: Date;
}

export async function initUserPasswordHistoryModel() {
  const sequelize = await getSequelize();
  if (!sequelize) return;

  UserPasswordHistory.init(
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
      passwordHash: {
        type: DataTypes.STRING(255),
        field: "f_password_hash",
        allowNull: false,
      },
      reason: {
        type: DataTypes.STRING(32),
        field: "f_reason",
        allowNull: false,
        defaultValue: "register",
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
      modelName: "UserPasswordHistory",
      tableName: "t_user_password_history",
      createdAt: false,
      updatedAt: false,
      freezeTableName: true,
    },
  );
}
