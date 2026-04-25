import { useMemo, useState } from "react";
import type { Endpoint, HttpMethod } from "../../types";

type Props = {
  endpoints: Endpoint[];
  selectedId?: string;
  onSelect: (e: Endpoint) => void;
};

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  POST: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  PUT: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  PATCH: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  DELETE: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

export function EndpointList({ endpoints, selectedId, onSelect }: Props) {
  const [filter, setFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState<HttpMethod | "ALL">("ALL");

  const filtered = useMemo(() => {
    const f = filter.toLowerCase();
    return endpoints.filter((e) => {
      if (methodFilter !== "ALL" && e.method !== methodFilter) return false;
      if (!f) return true;
      return (
        e.path.toLowerCase().includes(f) ||
        e.tag?.toLowerCase().includes(f) ||
        e.summary?.toLowerCase().includes(f)
      );
    });
  }, [endpoints, filter, methodFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, Endpoint[]>();
    for (const e of filtered) {
      const key = e.tag ?? "untagged";
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg flex flex-col h-full">
      <div className="p-3 border-b border-zinc-800 space-y-2">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter endpoints…"
          className="w-full px-3 py-1.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-cyan-500/50"
        />
        <div className="flex flex-wrap gap-1">
          {(["ALL", "GET", "POST", "PUT", "PATCH", "DELETE"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMethodFilter(m)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border transition ${
                methodFilter === m
                  ? m === "ALL"
                    ? "bg-zinc-700 text-zinc-100 border-zinc-600"
                    : METHOD_COLORS[m]
                  : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="text-[10px] text-zinc-500">
          {filtered.length} of {endpoints.length}
        </div>
      </div>
      <div className="flex-1 overflow-auto log-scroll">
        {grouped.length === 0 ? (
          <div className="p-6 text-center text-zinc-600 text-xs">
            {endpoints.length === 0 ? "No endpoints loaded yet." : "No matches."}
          </div>
        ) : (
          grouped.map(([tag, list]) => (
            <div key={tag} className="border-b border-zinc-800/50 last:border-0">
              <div className="px-3 py-1.5 bg-zinc-900/50 sticky top-0 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                {tag} <span className="text-zinc-600 normal-case">· {list.length}</span>
              </div>
              {list.map((e) => {
                const active = e.id === selectedId;
                return (
                  <button
                    key={e.id}
                    onClick={() => onSelect(e)}
                    className={`w-full text-left px-3 py-2 flex items-start gap-2 border-l-2 transition ${
                      active
                        ? "bg-zinc-800/60 border-cyan-400"
                        : "border-transparent hover:bg-zinc-800/30"
                    }`}
                  >
                    <span
                      className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${METHOD_COLORS[e.method]}`}
                    >
                      {e.method}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-mono text-zinc-200 truncate">{e.path}</div>
                      {e.summary && (
                        <div className="text-[10px] text-zinc-500 truncate">{e.summary}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
