import type { Env, Snapshot, SourceKey } from "./types";
import { SOURCES } from "./sources";

const key = (source: SourceKey) => `snapshot:${source}:latest`;

export async function readSnapshot(
  env: Env,
  source: SourceKey
): Promise<Snapshot | null> {
  return env.FEED_KV.get<Snapshot>(key(source), "json");
}

export async function writeSnapshot(
  env: Env,
  source: SourceKey,
  snap: Snapshot
): Promise<void> {
  await env.FEED_KV.put(key(source), JSON.stringify(snap));
}

export async function readAll(env: Env): Promise<Record<SourceKey, Snapshot | null>> {
  const entries = await Promise.all(
    SOURCES.map(async (s) => [s.key, await readSnapshot(env, s.key)] as const)
  );
  return Object.fromEntries(entries) as Record<SourceKey, Snapshot | null>;
}

/**
 * Fetch every source. On failure we keep the previous snapshot (so a transient
 * outage or DOM change doesn't wipe the list) and record the error.
 */
export async function refreshAll(
  env: Env
): Promise<Record<SourceKey, Snapshot>> {
  const fetchedAt = new Date().toISOString();
  const results = await Promise.all(
    SOURCES.map(async (s): Promise<readonly [SourceKey, Snapshot]> => {
      try {
        const items = await s.fetch(env);
        if (items.length === 0) throw new Error("no items parsed");
        const snap: Snapshot = { fetchedAt, items };
        await writeSnapshot(env, s.key, snap);
        return [s.key, snap] as const;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const prev = await readSnapshot(env, s.key);
        const snap: Snapshot = {
          fetchedAt: prev?.fetchedAt ?? fetchedAt,
          items: prev?.items ?? [],
          error: message,
        };
        // keep prev data but persist the error marker
        await writeSnapshot(env, s.key, snap);
        return [s.key, snap] as const;
      }
    })
  );
  return Object.fromEntries(results) as Record<SourceKey, Snapshot>;
}
