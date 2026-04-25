import type { Entity, SeedContext } from "./entities";
import type { Config, EntityUIState, LogEntry, Result, RunOptions } from "./types";

// ─── Topological sort (Kahn's algorithm via DFS) ──────────────────────────────

export function topoSort(list: Entity[]): Entity[] {
  const map = new Map(list.map((e) => [e.name, e]));
  const visited = new Set<string>();
  const temp = new Set<string>();
  const out: Entity[] = [];

  function visit(name: string) {
    if (visited.has(name)) return;
    if (temp.has(name)) throw new Error(`Dependency cycle involving "${name}"`);
    const entity = map.get(name);
    if (!entity) return; // Dependency not in selected set — skip (will fail soft at runtime)
    temp.add(name);
    for (const dep of entity.dependsOn ?? []) visit(dep);
    temp.delete(name);
    visited.add(name);
    out.push(entity);
  }

  for (const e of list) visit(e.name);
  return out;
}

// ─── Given selected entities, also include their transitive dependencies ──────

export function expandWithDependencies(
  selectedNames: Set<string>,
  allEntities: Entity[],
): Entity[] {
  const map = new Map(allEntities.map((e) => [e.name, e]));
  const result = new Set<string>();

  function include(name: string) {
    if (result.has(name)) return;
    const e = map.get(name);
    if (!e) return;
    result.add(name);
    for (const dep of e.dependsOn ?? []) include(dep);
  }

  for (const n of selectedNames) include(n);
  return Array.from(result)
    .map((n) => map.get(n))
    .filter((e): e is Entity => !!e);
}

// ─── ID Store: tracks direct entity IDs + nested sub-resource IDs ─────────────

class IdStore {
  private direct = new Map<string, string[]>();
  private related = new Map<string, string[]>(); // key = `${parent}::${sub}`

  addDirect(entity: string, id: string) {
    const list = this.direct.get(entity) ?? [];
    list.push(id);
    this.direct.set(entity, list);
  }

  addRelated(parent: string, sub: string, id: string) {
    const key = `${parent}::${sub}`;
    const list = this.related.get(key) ?? [];
    list.push(id);
    this.related.set(key, list);
  }

  pickId(entity: string): string {
    const list = this.direct.get(entity) ?? [];
    if (!list.length) {
      throw new Error(
        `No IDs available for "${entity}". Make sure "${entity}" is enabled and seeded first.`,
      );
    }
    return list[Math.floor(Math.random() * list.length)];
  }

  pickRelated(parent: string, sub: string): string {
    const key = `${parent}::${sub}`;
    const list = this.related.get(key) ?? [];
    if (!list.length) {
      throw new Error(
        `No related IDs for "${parent}.${sub}". The POST /${parent} response probably did not return nested "${sub}[].id" fields.`,
      );
    }
    return list[Math.floor(Math.random() * list.length)];
  }

  getIds(entity: string): string[] {
    return [...(this.direct.get(entity) ?? [])];
  }
}

// ─── Parse a creation response: extract top-level ID + any nested arrays ──────

function storeIdsFromResponse(raw: unknown, entityName: string, store: IdStore): string | null {
  // Most APIs wrap the created record in { data: ... } or { result: ... }.
  // Try common shapes, fall back to raw.
  const record: any =
    (raw as any)?.data ?? (raw as any)?.result ?? (raw as any)?.record ?? raw;

  if (!record || typeof record !== "object") return null;

  // Top-level ID — covers id, _id, uuid
  const topId = record.id ?? record._id ?? record.uuid;
  if (topId != null) store.addDirect(entityName, String(topId));

  // Walk object and find any array of objects with an `id` field,
  // store those under (parentEntity, arrayKey).
  const seen = new WeakSet<object>();
  (function walk(obj: any) {
    if (!obj || typeof obj !== "object" || seen.has(obj)) return;
    seen.add(obj);

    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value) && value.length > 0) {
        const first = value[0];
        if (first && typeof first === "object" && (first as any).id != null) {
          for (const item of value) {
            if (item && typeof item === "object" && (item as any).id != null) {
              store.addRelated(entityName, key, String((item as any).id));
            }
          }
        }
        // Also recurse into array items (they might have nested arrays)
        value.forEach((v) => walk(v));
      } else if (value && typeof value === "object") {
        walk(value);
      }
    }
  })(record);

  return topId != null ? String(topId) : null;
}

// ─── Header builder ───────────────────────────────────────────────────────────

function buildHeaders(config: Config): Record<string, string> {
  const base: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (!config.token) return base;

  switch (config.authScheme) {
    case "Bearer":
      base["Authorization"] = `Bearer ${config.token}`;
      break;
    case "Basic":
      base["Authorization"] = `Basic ${config.token}`;
      break;
    case "Custom":
      if (config.customHeaderName.trim()) {
        base[config.customHeaderName.trim()] = config.token;
      }
      break;
  }
  return base;
}

function resolveUrl(entity: Entity, config: Config): string {
  const base = entity.backend === "v1" ? config.baseUrlV1 : config.baseUrlRevamp;
  return `${base.replace(/\/$/, "")}${entity.endpoint}`;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const uid = () =>
  (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)) as string;

// ─── Test connection ─────────────────────────────────────────────────────────

export async function testConnection(url: string): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(url.replace(/\/$/, "") + "/", { method: "GET" });
    return {
      ok: true,
      message: `Reached ${url} — HTTP ${res.status} ${res.statusText}`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      message: `Could not reach ${url}: ${msg}. Likely CORS — see README for dev-proxy setup.`,
    };
  }
}

// ─── Main seeder ─────────────────────────────────────────────────────────────

export type SeedCallbacks = {
  onLog: (entry: LogEntry) => void;
  onProgress: (done: number, total: number) => void;
  onResult: (result: Result) => void;
  shouldAbort: () => boolean;
};

export async function seed(
  allEntities: Entity[],
  selected: EntityUIState[],
  config: Config,
  options: RunOptions,
  cb: SeedCallbacks,
): Promise<void> {
  const store = new IdStore();
  const ctx: SeedContext = {
    pickId: (e) => store.pickId(e),
    pickRelated: (p, s) => store.pickRelated(p, s),
    getIds: (e) => store.getIds(e),
  };

  // Only include enabled entities + their transitive dependencies
  const enabledNames = new Set(selected.filter((s) => s.enabled).map((s) => s.name));
  const expanded = expandWithDependencies(enabledNames, allEntities);
  const ordered = topoSort(expanded);
  const countMap = new Map(selected.map((s) => [s.name, s.count]));

  // Total planned requests
  const total = ordered.reduce((sum, e) => {
    // If entity is a transitive dep not directly selected, still seed at defaultCount
    const wasExplicitlySelected = enabledNames.has(e.name);
    const c = wasExplicitlySelected ? countMap.get(e.name) ?? e.defaultCount : e.defaultCount;
    return sum + c;
  }, 0);
  let done = 0;

  for (const entity of ordered) {
    if (cb.shouldAbort()) break;

    const wasExplicitlySelected = enabledNames.has(entity.name);
    const count = wasExplicitlySelected
      ? countMap.get(entity.name) ?? entity.defaultCount
      : entity.defaultCount;

    const result: Result = {
      entity: entity.name,
      createdIds: [],
      failed: 0,
      total: count,
    };

    cb.onLog({
      id: uid(),
      timestamp: new Date().toISOString(),
      level: "info",
      entity: entity.name,
      message: wasExplicitlySelected
        ? `Starting ${count} × ${entity.name} (${entity.backend})`
        : `Auto-seeding ${count} × ${entity.name} as dependency`,
    });

    const url = resolveUrl(entity, config);
    const headers = buildHeaders(config);

    const runOne = async (index: number) => {
      try {
        const payload = entity.payload(ctx);
        const res = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          let body: unknown = {};
          try {
            body = await res.json();
          } catch {
            /* empty/non-JSON body — still counts as success */
          }
          const id = storeIdsFromResponse(body, entity.name, store);
          if (id) result.createdIds.push(id);
          cb.onLog({
            id: uid(),
            timestamp: new Date().toISOString(),
            level: "success",
            entity: entity.name,
            index,
            status: res.status,
            message: `[${entity.name} ${index + 1}/${count}] → ${id ?? "(ok, no id found)"}`,
          });
        } else {
          result.failed++;
          let text = "";
          try {
            text = await res.text();
          } catch {
            /* ignore */
          }
          cb.onLog({
            id: uid(),
            timestamp: new Date().toISOString(),
            level: "error",
            entity: entity.name,
            index,
            status: res.status,
            message: `[${entity.name} ${index + 1}/${count}] HTTP ${res.status}: ${text.slice(0, 300)}`,
          });
        }
      } catch (err) {
        result.failed++;
        const msg = err instanceof Error ? err.message : String(err);
        const looksLikeCors =
          /failed to fetch|networkerror|load failed/i.test(msg);
        const looksLikeMissingDep = /No IDs available|No related IDs/i.test(msg);
        cb.onLog({
          id: uid(),
          timestamp: new Date().toISOString(),
          level: looksLikeMissingDep ? "skipped" : "error",
          entity: entity.name,
          index,
          message: looksLikeCors
            ? `[${entity.name} ${index + 1}/${count}] network error — likely CORS. Enable CORS on backend or use vite dev proxy.`
            : `[${entity.name} ${index + 1}/${count}] ${msg}`,
        });
      } finally {
        done++;
        cb.onProgress(done, total);
      }
    };

    if (options.sequential) {
      for (let i = 0; i < count; i++) {
        if (cb.shouldAbort()) break;
        await runOne(i);
        if (options.delay > 0 && i < count - 1) await sleep(options.delay);
      }
    } else {
      // Parallel within an entity — still waits for the entity to finish before next
      const tasks: Promise<void>[] = [];
      for (let i = 0; i < count; i++) {
        if (cb.shouldAbort()) break;
        tasks.push(runOne(i));
        if (options.delay > 0 && i < count - 1) await sleep(options.delay);
      }
      await Promise.all(tasks);
    }

    cb.onResult(result);
  }
}
