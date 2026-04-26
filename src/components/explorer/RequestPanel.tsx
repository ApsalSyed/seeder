import { useEffect, useRef, useState } from "react";
import type { Config, HttpMethod, KeyValueRow, RequestState } from "../../types";
import { buildAuthHeaders } from "../../api/httpClient";

type Props = {
  request: RequestState;
  onChange: (r: RequestState) => void;
  onSend: () => void;
  isSending: boolean;
  config: Config;
  onRegenerateBody?: () => void;
};

const METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: "text-emerald-300",
  POST: "text-cyan-300",
  PUT: "text-amber-300",
  PATCH: "text-violet-300",
  DELETE: "text-rose-300",
};

type SubTab = "params" | "headers" | "body" | "path";

export function RequestPanel({ request, onChange, onSend, isSending, config, onRegenerateBody }: Props) {
  const [subTab, setSubTab] = useState<SubTab>(
    Object.keys(request.pathParams).length > 0
      ? "path"
      : ["POST", "PUT", "PATCH"].includes(request.method)
        ? "body"
        : "params",
  );

  const update = <K extends keyof RequestState>(key: K, value: RequestState[K]) =>
    onChange({ ...request, [key]: value });

  const updateKV =
    (field: "queryParams" | "headers") => (rows: KeyValueRow[]) =>
      onChange({ ...request, [field]: rows });

  const updatePathParam = (name: string, value: string) =>
    onChange({ ...request, pathParams: { ...request.pathParams, [name]: value } });

  const formatBody = () => {
    try {
      const parsed = JSON.parse(request.body);
      onChange({ ...request, body: JSON.stringify(parsed, null, 2) });
    } catch {
      // ignore
    }
  };

  const hasBody = ["POST", "PUT", "PATCH", "DELETE"].includes(request.method);
  const pathParamNames = Object.keys(request.pathParams);

  // Auto-switch to path tab when endpoint changes and has path params
  useEffect(() => {
    if (pathParamNames.length > 0) setSubTab("path");
    else if (["POST", "PUT", "PATCH"].includes(request.method)) setSubTab("body");
    else setSubTab("params");
  }, [request.endpointId]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg flex flex-col">
      <div className="p-3 border-b border-zinc-800 flex gap-2">
        <select
          value={request.method}
          onChange={(e) => update("method", e.target.value as HttpMethod)}
          className={`px-2 py-2 rounded bg-zinc-950 border border-zinc-800 text-xs font-mono font-bold ${METHOD_COLORS[request.method]} focus:outline-none focus:border-cyan-500/50`}
        >
          {METHODS.map((m) => (
            <option key={m} value={m} className="text-zinc-100 bg-zinc-900">
              {m}
            </option>
          ))}
        </select>
        <input
          value={request.baseUrl}
          onChange={(e) => update("baseUrl", e.target.value)}
          placeholder="https://api…"
          className="px-2 py-2 rounded bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs font-mono focus:outline-none focus:border-cyan-500/50 w-48"
        />
        <input
          value={request.path}
          onChange={(e) => update("path", e.target.value)}
          placeholder="/path/{id}"
          className="flex-1 px-2 py-2 rounded bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs font-mono focus:outline-none focus:border-cyan-500/50"
        />
        <button
          onClick={onSend}
          disabled={isSending}
          className="px-4 py-2 rounded bg-cyan-500 text-zinc-950 text-xs font-bold hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {isSending ? "Sending…" : "Send"}
        </button>
      </div>

      <div className="px-3 pt-2 border-b border-zinc-800 flex gap-3">
        {pathParamNames.length > 0 && (
          <SubTabBtn active={subTab === "path"} onClick={() => setSubTab("path")}>
            Path <Badge>{pathParamNames.length}</Badge>
          </SubTabBtn>
        )}
        <SubTabBtn active={subTab === "params"} onClick={() => setSubTab("params")}>
          Query <Badge>{request.queryParams.filter((q) => q.enabled).length}</Badge>
        </SubTabBtn>
        <SubTabBtn active={subTab === "headers"} onClick={() => setSubTab("headers")}>
          Headers <Badge>{request.headers.filter((h) => h.enabled).length}</Badge>
        </SubTabBtn>
        {hasBody && (
          <SubTabBtn active={subTab === "body"} onClick={() => setSubTab("body")}>
            Body
          </SubTabBtn>
        )}
      </div>

      <div className="p-3 min-h-[200px]">
        {subTab === "path" && (
          <div className="space-y-2">
            {pathParamNames.length === 0 ? (
              <p className="text-xs text-zinc-500">No path parameters.</p>
            ) : (
              pathParamNames.map((name) => (
                <div key={name} className="grid grid-cols-[120px_1fr] gap-2 items-start">
                  <span className="text-xs font-mono text-zinc-400 pt-2">{name}</span>
                  <PathParamInput
                    paramName={name}
                    value={request.pathParams[name] ?? ""}
                    onChange={(v) => updatePathParam(name, v)}
                    currentPath={request.path}
                    pathParams={request.pathParams}
                    baseUrl={request.baseUrl}
                    config={config}
                  />
                </div>
              ))
            )}
          </div>
        )}
        {subTab === "params" && (
          <KVTable rows={request.queryParams} onChange={updateKV("queryParams")} keyLabel="Key" />
        )}
        {subTab === "headers" && (
          <KVTable rows={request.headers} onChange={updateKV("headers")} keyLabel="Header" />
        )}
        {subTab === "body" && hasBody && (
          <div className="space-y-2">
            <div className="flex justify-end gap-2">
              <button
                onClick={formatBody}
                className="text-[11px] px-2 py-1 rounded border border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800"
              >
                Format JSON
              </button>
              {onRegenerateBody && (
                <button
                  onClick={onRegenerateBody}
                  className="text-[11px] px-2 py-1 rounded border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20"
                >
                  Regenerate sample
                </button>
              )}
            </div>
            <textarea
              value={request.body}
              onChange={(e) => update("body", e.target.value)}
              spellCheck={false}
              className="w-full h-64 px-3 py-2 rounded bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs font-mono focus:outline-none focus:border-cyan-500/50 resize-y"
              placeholder={`{\n  "key": "value"\n}`}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Path param input with ID picker ────────────────────────────────────────

type PickerItem = { id: string; label: string };

function PathParamInput({
  paramName,
  value,
  onChange,
  currentPath,
  pathParams,
  baseUrl,
  config,
}: {
  paramName: string;
  value: string;
  onChange: (v: string) => void;
  currentPath: string;
  pathParams: Record<string, string>;
  baseUrl: string;
  config: Config;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<PickerItem[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleFetch = async () => {
    if (open) {
      setOpen(false);
      return;
    }

    setOpen(true);
    setLoading(true);
    setError("");
    setItems([]);
    setSearch("");

    // Derive the list URL: everything before /{paramName}
    const segments = currentPath.split("/");
    const paramIdx = segments.findIndex((s) => s === `{${paramName}}`);
    if (paramIdx === -1) {
      setError("Cannot derive list endpoint");
      setLoading(false);
      return;
    }
    let listPath = segments.slice(0, paramIdx).join("/");

    // Fill any other path params that have values
    for (const [k, v] of Object.entries(pathParams)) {
      if (k !== paramName && v) {
        listPath = listPath.replace(`{${k}}`, encodeURIComponent(v));
      }
    }

    // Check if unfilled params remain
    if (/\{[^}]+\}/.test(listPath)) {
      setError("Fill other path params first");
      setLoading(false);
      return;
    }

    const url = `${baseUrl.replace(/\/$/, "")}${listPath}?page=1&limit=50`;

    try {
      const headers: Record<string, string> = {
        Accept: "application/json",
        ...buildAuthHeaders(config),
      };
      const res = await fetch(url, { method: "GET", headers });
      if (!res.ok) {
        setError(`HTTP ${res.status} ${res.statusText}`);
        setLoading(false);
        return;
      }
      const body = await res.json();
      const extracted = extractItems(body);
      if (extracted.length === 0) {
        setError("No items found in response");
      }
      setItems(extracted);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(/failed to fetch|networkerror|load failed/i.test(msg) ? "Network error — likely CORS" : msg);
    }
    setLoading(false);
  };

  const filtered = search
    ? items.filter(
        (it) =>
          it.id.toLowerCase().includes(search.toLowerCase()) ||
          it.label.toLowerCase().includes(search.toLowerCase()),
      )
    : items;

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Value for {${paramName}}`}
          className="flex-1 px-2 py-1.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs font-mono focus:outline-none focus:border-cyan-500/50"
        />
        <button
          onClick={handleFetch}
          className={`px-2.5 py-1.5 rounded text-[11px] font-medium border transition ${
            open
              ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
              : "bg-zinc-800/60 text-zinc-400 border-zinc-700 hover:text-zinc-200 hover:border-zinc-600"
          }`}
        >
          Pick
        </button>
      </div>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl shadow-black/40 overflow-hidden">
          {/* Search */}
          {items.length > 5 && (
            <div className="p-2 border-b border-zinc-800">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                autoFocus
                className="w-full px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-zinc-100 text-[11px] font-mono focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="px-3 py-4 text-center">
              <div className="inline-block size-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-[11px] text-zinc-500 mt-1">Fetching…</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="px-3 py-3 text-[11px] text-rose-400">{error}</div>
          )}

          {/* Items */}
          {!loading && filtered.length > 0 && (
            <div className="max-h-[240px] overflow-auto log-scroll">
              {filtered.map((item, i) => (
                <button
                  key={`${item.id}-${i}`}
                  onClick={() => {
                    onChange(item.id);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-zinc-800/60 transition border-b border-zinc-800/40 last:border-0 ${
                    value === item.id ? "bg-cyan-500/10" : ""
                  }`}
                >
                  <span className="text-[11px] font-mono text-zinc-200 truncate flex-1">
                    {item.label}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                    {item.id.length > 20 ? item.id.slice(0, 8) + "…" + item.id.slice(-8) : item.id}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Empty after filter */}
          {!loading && !error && items.length > 0 && filtered.length === 0 && (
            <div className="px-3 py-3 text-[11px] text-zinc-500">No matches for "{search}"</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Extract items from various API response shapes ──────────────────────────

function extractItems(body: unknown): PickerItem[] {
  const arr = findArray(body);
  if (!arr) return [];

  return arr
    .filter((item: any) => item && typeof item === "object" && (item.id ?? item._id) != null)
    .map((item: any) => ({
      id: String(item.id ?? item._id),
      label:
        item.name ??
        item.title ??
        item.contactName ??
        item.email ??
        item.equipmentName ??
        item.serviceName ??
        item.note?.slice(0, 40) ??
        String(item.id ?? item._id),
    }));
}

function findArray(body: unknown): any[] | null {
  if (Array.isArray(body)) return body;
  if (!body || typeof body !== "object") return null;
  const obj = body as Record<string, unknown>;
  // Common wrapper keys — check in priority order
  for (const key of ["data", "result", "records", "items", "results", "rows", "list"]) {
    if (Array.isArray(obj[key])) return obj[key] as any[];
  }
  // Check one level deeper (e.g. { data: { records: [...] } })
  if (obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)) {
    const nested = obj.data as Record<string, unknown>;
    for (const key of ["records", "items", "results", "rows", "list"]) {
      if (Array.isArray(nested[key])) return nested[key] as any[];
    }
  }
  return null;
}

// ─── Shared UI components ───────────────────────────────────────────────────

function SubTabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`pb-2 text-xs font-medium transition border-b-2 ${
        active ? "text-cyan-300 border-cyan-400" : "text-zinc-500 border-transparent hover:text-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[16px] px-1 rounded bg-zinc-800 text-[9px] text-zinc-400 font-mono">
      {children}
    </span>
  );
}

function KVTable({
  rows,
  onChange,
  keyLabel,
}: {
  rows: KeyValueRow[];
  onChange: (rows: KeyValueRow[]) => void;
  keyLabel: string;
}) {
  const update = (i: number, patch: Partial<KeyValueRow>) => {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };
  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  const add = () => onChange([...rows, { key: "", value: "", enabled: true }]);

  return (
    <div className="space-y-1.5">
      {rows.map((r, i) => (
        <div key={i} className="flex gap-1.5 items-center">
          <input
            type="checkbox"
            checked={r.enabled}
            onChange={(e) => update(i, { enabled: e.target.checked })}
            className="accent-cyan-500"
          />
          <input
            value={r.key}
            onChange={(e) => update(i, { key: e.target.value })}
            placeholder={keyLabel}
            className="flex-1 px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs font-mono focus:outline-none focus:border-cyan-500/50"
          />
          <input
            value={r.value}
            onChange={(e) => update(i, { value: e.target.value })}
            placeholder="Value"
            className="flex-1 px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs font-mono focus:outline-none focus:border-cyan-500/50"
          />
          <button
            onClick={() => remove(i)}
            className="text-zinc-500 hover:text-rose-400 px-2 text-sm"
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={add}
        className="text-[11px] px-2 py-1 rounded border border-dashed border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 w-full transition"
      >
        + Add row
      </button>
    </div>
  );
}
