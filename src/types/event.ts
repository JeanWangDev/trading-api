export type EventRecord = {
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

export type EventListResult = {
  data: EventRecord[];
  total: number;
  page: number;
  pageSize: number;
};
