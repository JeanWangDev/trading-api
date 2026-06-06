import { randomUUID } from "crypto";
import Parser from "rss-parser";
import { EventService, type UpsertEventInput } from "@/services/events";
import { extractSymbols } from "@/utils/extract-symbols";
import { resolvePrimarySymbol } from "@/utils/event-symbols";
import { RSS_SOURCES } from "@/ingest/rss-sources";

const parser = new Parser({
  timeout: 20_000,
  headers: {
    "User-Agent": "PolarisEventBot/1.0 (+https://polaris.local)",
    Accept: "application/rss+xml, application/xml, text/xml",
  },
});

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function itemExternalId(sourceKey: string, guid?: string, link?: string): string {
  const base = (guid || link || "").trim();
  return base ? `${sourceKey}:${base}` : `${sourceKey}:${randomUUID()}`;
}

export async function ingestRssFeeds(): Promise<{
  created: number;
  skipped: number;
  errors: string[];
}> {
  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const source of RSS_SOURCES) {
    try {
      const feed = await parser.parseURL(source.url);
      const batch: UpsertEventInput[] = [];

      for (const item of feed.items.slice(0, 25)) {
        const title = (item.title ?? "").trim();
        if (!title) continue;

        const link = (item.link ?? "").trim();
        const guid = item.guid ?? item.id ?? link;
        const externalId = itemExternalId(source.key, guid, link);
        const rawContent = item.contentSnippet ?? item.content ?? item.summary ?? "";
        const description = stripHtml(String(rawContent)).slice(0, 2000);

        const pubDate = item.isoDate ?? item.pubDate;
        const publishedAt = pubDate ? new Date(pubDate).getTime() : Date.now();

        const extracted = extractSymbols(title, description);
        const primary = resolvePrimarySymbol(...extracted);
        if (!primary) continue;

        const itunesImage = (item as { itunes?: { image?: string } }).itunes?.image;
        const cover =
          (item.enclosure?.url && item.enclosure.type?.startsWith("image")
            ? item.enclosure.url
            : "") ||
          (typeof itunesImage === "string" ? itunesImage : "") ||
          "";

        batch.push({
          eventId: randomUUID(),
          source: `rss_${source.key}`,
          externalId,
          type: "news",
          title,
          description: description || title,
          url: link,
          cover,
          symbols: [primary],
          sentiment: "neutral",
          publishedAt,
        });
      }

      const result = await EventService.batchUpsert(batch);
      created += result.created;
      skipped += result.skipped;
    } catch (error) {
      errors.push(
        `${source.name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return { created, skipped, errors };
}
