import type { SourceDef } from "../types";
import { fetchHackerNews } from "./hackernews";
import { fetchOpenAI } from "./openai";
import { fetchAnthropic } from "./anthropic";
import { fetchGithub } from "./github";

export const SOURCES: SourceDef[] = [
  {
    key: "github",
    label: "GitHub Trending",
    homepage: "https://github.com/trending",
    fetch: fetchGithub,
  },
  {
    key: "anthropic",
    label: "Anthropic",
    homepage: "https://www.anthropic.com/news",
    fetch: fetchAnthropic,
  },
  {
    key: "openai",
    label: "OpenAI",
    homepage: "https://openai.com/news",
    fetch: fetchOpenAI,
  },
  {
    key: "hackernews",
    label: "Hacker News",
    homepage: "https://news.ycombinator.com",
    fetch: fetchHackerNews,
  },
];
