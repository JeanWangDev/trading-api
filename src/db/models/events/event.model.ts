import { DataTypes, Model } from "sequelize";
import { getSequelize } from "@/db/connection";

export class Event extends Model {
  declare id: number;
  declare eventId: string;
  declare source: string;
  declare externalId: string;
  declare type: string;
  declare title: string;
  declare description: string | null;
  declare url: string;
  declare cover: string;
  declare symbols: string[] | null;
  declare sentiment: string;
  declare impact: number;
  declare status: number;
  declare publishedAt: number;
  declare ingestedAt: number;
  declare createTime: Date;
  declare updateTime: Date;
}

export async function initEventModel() {
  const sequelize = await getSequelize();
  if (!sequelize) return;

  Event.init(
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        field: "f_id",
      },
      eventId: {
        type: DataTypes.STRING(64),
        field: "f_event_id",
        allowNull: false,
        unique: "uniq_event_id",
      },
      source: {
        type: DataTypes.STRING(32),
        field: "f_source",
        allowNull: false,
      },
      externalId: {
        type: DataTypes.STRING(512),
        field: "f_external_id",
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING(32),
        field: "f_type",
        allowNull: false,
        defaultValue: "news",
      },
      title: {
        type: DataTypes.STRING(500),
        field: "f_title",
        allowNull: false,
        defaultValue: "",
      },
      description: {
        type: DataTypes.TEXT,
        field: "f_description",
        allowNull: true,
      },
      url: {
        type: DataTypes.STRING(1024),
        field: "f_url",
        allowNull: false,
        defaultValue: "",
      },
      cover: {
        type: DataTypes.STRING(1024),
        field: "f_cover",
        allowNull: false,
        defaultValue: "",
      },
      symbols: {
        type: DataTypes.JSON,
        field: "f_symbols",
        allowNull: true,
      },
      sentiment: {
        type: DataTypes.STRING(16),
        field: "f_sentiment",
        allowNull: false,
        defaultValue: "neutral",
      },
      impact: {
        type: DataTypes.TINYINT,
        field: "f_impact",
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: DataTypes.TINYINT,
        field: "f_status",
        allowNull: false,
        defaultValue: 1,
      },
      publishedAt: {
        type: DataTypes.BIGINT,
        field: "f_published_at",
        allowNull: false,
      },
      ingestedAt: {
        type: DataTypes.BIGINT,
        field: "f_ingested_at",
        allowNull: false,
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
      modelName: "Event",
      tableName: "t_event",
      createdAt: false,
      updatedAt: false,
      freezeTableName: true,
    },
  );
}
