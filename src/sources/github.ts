import type { Env, FeedItem } from "../types";
import { fetchText, stripTags } from "./http";

const BASE = "https://github.com";

/**
 * GitHub Trending has no public API. We scrape the trending page and key off
 * the stable `<article class="Box-row">` / `<h2 class="h3 ...">` structure.
 */
export async function fetchGithub(env: Env): Promise<FeedItem[]> {
  const limit = Number(env.PAGE_LIMIT ?? "15");
  const html = await fetchText(`${BASE}/trending?since=daily`);

  const items: FeedItem[] = [];
  const articles = html.match(/<article class="Box-row">[\s\S]*?<\/article>/gi) ?? [];

  for (const art of articles) {
    const a = art.match(
      /<h2[^>]*class="h3[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i
    );
    if (!a) continue;

    const path = a[1].trim();
    const repo = stripTags(a[2]).replace(/\s*\/\s*/, "/");
    if (!repo) continue;

    const starsToday = art.match(
      /<span[^>]*float-sm-right[^>]*>([\s\S]*?)<\/span>/i
    );
    const meta = starsToday ? stripTags(starsToday[1]) : undefined;

    items.push({
      title: repo,
      url: `${BASE}${path}`,
      source: "github",
      meta,
    });
    if (items.length >= limit) break;
  }

  return items;
}
