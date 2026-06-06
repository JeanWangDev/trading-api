import { DataTypes, Model, type Optional } from "sequelize";
import { getSequelize } from "@/db/connection";

export type EmailVerificationAttributes = {
  id: number;
  email: string;
  purpose: string;
  codeHash: string;
  expireTime: Date;
  used: number;
  usedTime: Date | null;
  createTime: Date;
};

type EmailVerificationCreationAttributes = Optional<
  EmailVerificationAttributes,
  "id" | "used" | "usedTime" | "createTime"
>;

export class EmailVerification extends Model<
  EmailVerificationAttributes,
  EmailVerificationCreationAttributes
> {
  declare id: number;
  declare email: string;
  declare purpose: string;
  declare codeHash: string;
  declare expireTime: Date;
  declare used: number;
  declare usedTime: Date | null;
  declare createTime: Date;
}

export async function initEmailVerificationModel() {
  const sequelize = await getSequelize();
  if (!sequelize) return;

  EmailVerification.init(
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        field: "f_id",
      },
      email: {
        type: DataTypes.STRING(255),
        field: "f_email",
        allowNull: false,
      },
      purpose: {
        type: DataTypes.STRING(32),
        field: "f_purpose",
        allowNull: false,
      },
      codeHash: {
        type: DataTypes.STRING(64),
        field: "f_code_hash",
        allowNull: false,
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
      tableName: "t_email_verification",
      timestamps: false,
    },
  );
}
