import type { EventRecord } from "@/types/event";

export type EventListItemDto = {
  id: string;
  source: string;
  type: string;
  title: string;
  description: string;
  url: string;
  cover: string;
  symbols: string[];
  primarySymbol: string;
  sentiment: string;
  impact: number;
  publishedAt: number;
  ingestedAt: number;
};

export type EventDetailDto = EventListItemDto;

export function toEventListItemDto(item: EventRecord): EventListItemDto {
  return {
    id: item.id,
    source: item.source,
    type: item.type,
    title: item.title,
    description: item.description,
    url: item.url,
    cover: item.cover,
    symbols: item.symbols,
    primarySymbol: item.primarySymbol,
    sentiment: item.sentiment,
    impact: item.impact,
    publishedAt: item.publishedAt,
    ingestedAt: item.ingestedAt,
  };
}

export function toEventDetailDto(item: EventRecord): EventDetailDto {
  return toEventListItemDto(item);
}
