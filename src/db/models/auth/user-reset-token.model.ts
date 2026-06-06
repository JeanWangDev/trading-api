import { DataTypes, Model } from "sequelize";
import { getSequelize } from "@/db/connection";

export class UserResetToken extends Model {
  declare id: number;
  declare userId: number;
  declare tokenHash: string;
  declare expireTime: Date;
  declare used: number;
  declare usedTime: Date | null;
  declare createTime: Date;
}

export async function initUserResetTokenModel() {
  const sequelize = await getSequelize();
  if (!sequelize) return;

  UserResetToken.init(
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
      tokenHash: {
        type: DataTypes.STRING(128),
        field: "f_token_hash",
        allowNull: false,
        unique: "uniq_reset_token_hash",
      },
      expireTime: {
        type: DataTypes.DATE,
        field: "f_expire_time",
        allowNull: false,
      },
      used: {
        type: DataTypes.TINYINT,
        field: "f_used",
        allowNull: false,
        defaultValue: 0,
      },
      usedTime: {
        type: DataTypes.DATE,
        field: "f_used_time",
        allowNull: true,
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
      modelName: "UserResetToken",
      tableName: "t_user_reset_token",
      createdAt: false,
      updatedAt: false,
      freezeTableName: true,
    },
  );
}
