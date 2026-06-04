import type { Env, FeedItem } from "../types";
import { fetchJson } from "./http";

interface HnItem {
  id: number;
  title?: string;
  url?: string;
  score?: number;
  descendants?: number;
  type?: string;
}

export async function fetchHackerNews(env: Env): Promise<FeedItem[]> {
  const limit = Number(env.HN_LIMIT ?? "30");
  const ids = await fetchJson<number[]>(
    "https://hacker-news.firebaseio.com/v0/topstories.json"
  );
  const top = ids.slice(0, limit);

  const items = await Promise.all(
    top.map((id) =>
      fetchJson<HnItem>(
        `https://hacker-news.firebaseio.com/v0/item/${id}.json`
      ).catch(() => null)
    )
  );

  return items
    .filter((it): it is HnItem => !!it && !!it.title)
    .map((it) => ({
      title: it.title!,
      url: it.url ?? `https://news.ycombinator.com/item?id=${it.id}`,
      source: "hackernews" as const,
      meta: `▲ ${it.score ?? 0} · ${it.descendants ?? 0} comments`,
    }));
}
