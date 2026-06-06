/** 免费 RSS 源（公开 feed，无需 API Key） */
export type RssSourceConfig = {
  key: string;
  name: string;
  url: string;
};

/** MVP Lite：2 个源（海外 1 + 中文 1） */
export const RSS_SOURCES: RssSourceConfig[] = [
  {
    key: "coindesk",
    name: "CoinDesk",
    url: "https://www.coindesk.com/arc/outboundfeeds/rss/?outputType=xml",
  },
  {
    key: "odaily",
    name: "Odaily",
    url: "https://www.odaily.news/rss",
  },
];
