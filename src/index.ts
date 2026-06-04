import type { Env } from "./types";
import { readAll, refreshAll } from "./store";
import { renderPage } from "./render";

function authorized(req: Request, env: Env): boolean {
  if (!env.REFRESH_TOKEN) return true; // no token configured → open
  const header = req.headers.get("Authorization") ?? "";
  const bearer = header.replace(/^Bearer\s+/i, "");
  const url = new URL(req.url);
  const qp = url.searchParams.get("key") ?? "";
  return bearer === env.REFRESH_TOKEN || qp === env.REFRESH_TOKEN;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === "/refresh") {
      if (!authorized(req, env)) return json({ error: "unauthorized" }, 401);
      const result = await refreshAll(env);
      const summary = Object.fromEntries(
        Object.entries(result).map(([k, v]) => [
          k,
          { count: v.items.length, error: v.error ?? null },
        ])
      );
      return json({ ok: true, refreshedAt: new Date().toISOString(), summary });
    }

    if (url.pathname === "/api/feed") {
      return json(await readAll(env));
    }

    if (url.pathname === "/" || url.pathname === "") {
      const snapshots = await readAll(env);
      const empty = Object.values(snapshots).every((s) => !s);
      // first-ever visit with empty KV: kick off a background refresh
      if (empty) ctx.waitUntil(refreshAll(env));
      return new Response(renderPage(snapshots, Boolean(env.REFRESH_TOKEN)), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    return new Response("Not found", { status: 404 });
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(refreshAll(env));
  },
};
