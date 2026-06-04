export type SourceKey = "hackernews" | "openai" | "anthropic" | "github";

export interface FeedItem {
  title: string;
  url: string;
  source: SourceKey;
  meta?: string;
}

export interface Snapshot {
  fetchedAt: string;
  items: FeedItem[];
  error?: string;
}

export interface SourceDef {
  key: SourceKey;
  label: string;
  homepage: string;
  fetch: (env: Env) => Promise<FeedItem[]>;
}

export interface Env {
  FEED_KV: KVNamespace;
  REFRESH_TOKEN?: string;
  HN_LIMIT?: string;
  RSS_LIMIT?: string;
  PAGE_LIMIT?: string;
}
