import type { Env, FeedItem } from "../types";
import { fetchText, decodeEntities, stripTags } from "./http";

/** Parse <item> (RSS) or <entry> (Atom) blocks with lightweight regex. */
export function parseFeed(
  xml: string,
  source: FeedItem["source"],
  limit: number
): FeedItem[] {
  const items: FeedItem[] = [];
  const blocks =
    xml.match(/<item\b[\s\S]*?<\/item>/gi) ??
    xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ??
    [];

  for (const block of blocks) {
    const titleRaw =
      block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
    const title = decodeEntities(stripTags(titleRaw));

    // RSS uses <link>url</link>; Atom uses <link href="url"/>.
    let url =
      block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]?.trim() ?? "";
    if (!url) {
      url = block.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1]?.trim() ?? "";
    }
    url = decodeEntities(url);

    const dateRaw =
      block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] ??
      block.match(/<updated>([\s\S]*?)<\/updated>/i)?.[1] ??
      block.match(/<published>([\s\S]*?)<\/published>/i)?.[1] ??
      "";

    if (!title || !url) continue;

    let meta: string | undefined;
    const d = new Date(dateRaw.trim());
    if (!isNaN(d.getTime())) {
      meta = d.toISOString().slice(0, 10);
    }

    items.push({ title, url, source, meta });
    if (items.length >= limit) break;
  }

  return items;
}

export async function fetchOpenAI(env: Env): Promise<FeedItem[]> {
  const limit = Number(env.RSS_LIMIT ?? "15");
  const xml = await fetchText(
    "https://openai.com/news/rss.xml",
    "application/rss+xml, application/xml, text/xml"
  );
  return parseFeed(xml, "openai", limit);
}
