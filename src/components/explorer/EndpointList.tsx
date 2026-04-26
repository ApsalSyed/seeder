import { useEffect, useMemo, useState } from "react";
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

const BACKEND_COLORS: Record<string, string> = {
  v1: "bg-amber-500/10 text-amber-400 border-amber-500/25",
  revamp: "bg-cyan-500/10 text-cyan-400 border-cyan-500/25",
  custom: "bg-zinc-500/10 text-zinc-400 border-zinc-500/25",
};

export function EndpointList({ endpoints, selectedId, onSelect }: Props) {
  const [filter, setFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState<HttpMethod | "ALL">("ALL");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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

  // Auto-expand group containing the selected endpoint
  useEffect(() => {
    if (!selectedId) return;
    for (const [tag, list] of grouped) {
      if (list.some((e) => e.id === selectedId) && !expanded.has(tag)) {
        setExpanded((prev) => new Set(prev).add(tag));
        break;
      }
    }
  }, [selectedId, grouped]);

  // When filter is active, auto-expand all matching groups
  useEffect(() => {
    if (filter || methodFilter !== "ALL") {
      setExpanded(new Set(grouped.map(([tag]) => tag)));
    }
  }, [filter, methodFilter, grouped.length]);

  const toggleGroup = (tag: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const allExpanded = grouped.length > 0 && grouped.every(([tag]) => expanded.has(tag));

  const toggleAll = () => {
    if (allExpanded) {
      setExpanded(new Set());
    } else {
      setExpanded(new Set(grouped.map(([tag]) => tag)));
    }
  };

  /** Shorten endpoint path for display: strip common prefixes */
  const shortPath = (path: string): string => {
    return path
      .replace(/^\/api\/v1\//, "/")
      .replace(/\{([^}]+)\}/g, ":$1");
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg flex flex-col h-full">
      <div className="p-3 border-b border-zinc-800 space-y-2">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search endpoints…"
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
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-500">
            {filtered.length} of {endpoints.length} · {grouped.length} groups
          </span>
          <button
            onClick={toggleAll}
            className="text-[10px] text-zinc-500 hover:text-zinc-300 transition"
          >
            {allExpanded ? "Collapse all" : "Expand all"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto log-scroll">
        {grouped.length === 0 ? (
          <div className="p-6 text-center text-zinc-600 text-xs">
            {endpoints.length === 0 ? "No endpoints loaded yet." : "No matches."}
          </div>
        ) : (
          grouped.map(([tag, list]) => {
            const isExpanded = expanded.has(tag);
            const backend = list[0]?.backend ?? "v1";
            const methods = [...new Set(list.map((e) => e.method))];

            return (
              <div key={tag} className="border-b border-zinc-800/50 last:border-0">
                {/* Group header — clickable to expand/collapse */}
                <button
                  onClick={() => toggleGroup(tag)}
                  className="w-full text-left px-3 py-2 bg-zinc-900/50 sticky top-0 z-10 flex items-center gap-2 hover:bg-zinc-800/40 transition group"
                >
                  <svg
                    className={`size-3 text-zinc-500 transition-transform shrink-0 ${isExpanded ? "rotate-90" : ""}`}
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M6 3l5 5-5 5V3z" />
                  </svg>

                  <span className="text-[11px] font-semibold text-zinc-200 tracking-wide">
                    {tag}
                  </span>

                  <span
                    className={`shrink-0 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase border ${BACKEND_COLORS[backend] ?? BACKEND_COLORS.custom}`}
                  >
                    {backend}
                  </span>

                  {/* Method dots — quick visual of what's available */}
                  <div className="flex gap-0.5 ml-auto">
                    {(["GET", "POST", "PUT", "PATCH", "DELETE"] as const).map((m) =>
                      methods.includes(m) ? (
                        <span
                          key={m}
                          className={`size-1.5 rounded-full ${
                            m === "GET" ? "bg-emerald-400" :
                            m === "POST" ? "bg-cyan-400" :
                            m === "PUT" ? "bg-amber-400" :
                            m === "PATCH" ? "bg-violet-400" :
                            "bg-rose-400"
                          }`}
                        />
                      ) : (
                        <span key={m} className="size-1.5 rounded-full bg-zinc-800" />
                      ),
                    )}
                  </div>

                  <span className="text-[10px] text-zinc-600 font-mono tabular-nums shrink-0">
                    {list.length}
                  </span>
                </button>

                {/* Endpoint rows */}
                {isExpanded &&
                  list.map((e) => {
                    const active = e.id === selectedId;
                    return (
                      <button
                        key={e.id}
                        onClick={() => onSelect(e)}
                        className={`w-full text-left px-3 py-1.5 pl-7 flex items-center gap-2 border-l-2 transition ${
                          active
                            ? "bg-zinc-800/60 border-cyan-400"
                            : "border-transparent hover:bg-zinc-800/30"
                        }`}
                      >
                        <span
                          className={`shrink-0 w-[42px] text-center px-1 py-0.5 rounded text-[9px] font-mono font-bold border ${METHOD_COLORS[e.method]}`}
                        >
                          {e.method}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-mono text-zinc-300 truncate">
                            {shortPath(e.path)}
                          </div>
                          {e.summary && (
                            <div className="text-[10px] text-zinc-500 truncate">{e.summary}</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
