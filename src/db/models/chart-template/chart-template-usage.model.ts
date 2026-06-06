import { DataTypes, Model, type Optional } from "sequelize";
import { getSequelize } from "@/db/connection";

export type ChartTemplateUsageAttributes = {
  id: number;
  templateId: string;
  userId: number | null;
  eventType: string;
  createTime: Date;
};

type ChartTemplateUsageCreationAttributes = Optional<
  ChartTemplateUsageAttributes,
  "id" | "userId" | "createTime"
>;

export class ChartTemplateUsage extends Model<
  ChartTemplateUsageAttributes,
  ChartTemplateUsageCreationAttributes
> {
  declare id: number;
  declare templateId: string;
  declare userId: number | null;
  declare eventType: string;
  declare createTime: Date;
}

export async function initChartTemplateUsageModel() {
  const sequelize = await getSequelize();
  if (!sequelize) return;

  ChartTemplateUsage.init(
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
      },
      userId: {
        type: DataTypes.BIGINT,
        field: "f_user_id",
        allowNull: true,
      },
      eventType: {
        type: DataTypes.STRING(16),
        field: "f_event_type",
        allowNull: false,
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
      tableName: "t_chart_template_usage",
      timestamps: false,
    },
  );
}
