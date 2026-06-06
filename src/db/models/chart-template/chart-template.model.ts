import { DataTypes, Model } from "sequelize";
import { getSequelize } from "@/db/connection";

export class ChartTemplate extends Model {
  declare id: number;
  declare templateId: string;
  declare userId: number;
  declare name: string;
  declare symbol: string;
  declare symbolId: number | null;
  declare indicatorIds: string[];
  declare visibility: number;
  declare isDefault: number;
  declare status: number;
  declare createTime: Date;
  declare updateTime: Date;
}

export async function initChartTemplateModel() {
  const sequelize = await getSequelize();
  if (!sequelize) return;

  ChartTemplate.init(
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        field: "f_id",
      },
      templateId: {
        type: DataTypes.STRING(64),
        field: "f_template_id",
        allowNull: false,
        unique: "uniq_template_id",
      },
      userId: {
        type: DataTypes.BIGINT,
        field: "f_user_id",
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(128),
        field: "f_name",
        allowNull: false,
        defaultValue: "",
      },
      symbol: {
        type: DataTypes.STRING(32),
        field: "f_symbol",
        allowNull: false,
        defaultValue: "",
      },
      symbolId: {
        type: DataTypes.INTEGER,
        field: "f_symbol_id",
        allowNull: true,
      },
      indicatorIds: {
        type: DataTypes.JSON,
        field: "f_indicator_ids",
        allowNull: false,
      },
      visibility: {
        type: DataTypes.TINYINT,
        field: "f_visibility",
        allowNull: false,
        defaultValue: 0,
      },
      isDefault: {
        type: DataTypes.TINYINT,
        field: "f_is_default",
        allowNull: false,
        defaultValue: 0,
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
      tableName: "t_chart_template",
      timestamps: false,
    },
  );
}
