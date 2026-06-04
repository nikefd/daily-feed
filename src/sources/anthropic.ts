import type { Env, FeedItem } from "../types";
import { fetchText, decodeEntities, stripTags } from "./http";

const BASE = "https://www.anthropic.com";

/**
 * Anthropic has no public RSS, so we scrape the news index. We key off the
 * stable `/news/<slug>` href rather than CSS-module class hashes (which change
 * between builds), pulling the title from an inner heading or *title* span.
 */
export async function fetchAnthropic(env: Env): Promise<FeedItem[]> {
  const limit = Number(env.PAGE_LIMIT ?? "15");
  const html = await fetchText(`${BASE}/news`);

  const items: FeedItem[] = [];
  const seen = new Set<string>();

  const anchorRe =
    /<a\b[^>]*href="(\/news\/[^"#?]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;

  while ((m = anchorRe.exec(html)) !== null) {
    const path = m[1];
    const inner = m[2];

    // skip non-article links (category/index pages)
    if (path === "/news" || /\/news\/(all|category)/i.test(path)) continue;

    const titleMatch =
      inner.match(/<(?:h1|h2|h3|h4)[^>]*>([\s\S]*?)<\/(?:h1|h2|h3|h4)>/i) ??
      inner.match(/<span[^>]*title[^>]*>([\s\S]*?)<\/span>/i);

    const title = titleMatch ? stripTags(titleMatch[1]) : stripTags(inner);
    if (!title || title.length < 3) continue;

    const url = `${BASE}${decodeEntities(path)}`;
    if (seen.has(url)) continue;
    seen.add(url);

    items.push({ title, url, source: "anthropic" });
    if (items.length >= limit) break;
  }

  return items;
}
