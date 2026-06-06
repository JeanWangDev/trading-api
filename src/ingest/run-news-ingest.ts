import { ingestRssFeeds } from "@/ingest/rss-ingest";
import { EventService } from "@/services/events";

export type IngestSummary = {
  rss: { created: number; skipped: number; errors: string[] };
  totalPublished?: number;
};

/** MVP Lite：仅 RSS（爆仓由常驻 worker 写入） */
export async function runNewsIngest(): Promise<IngestSummary> {
  const rss = await ingestRssFeeds();
  const totalPublished = await EventService.countPublished();

  return {
    rss,
    totalPublished,
  };
}
