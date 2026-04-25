import { useState } from "react";
import type { HttpMethod, KeyValueRow, RequestState } from "../../types";

type Props = {
  request: RequestState;
  onChange: (r: RequestState) => void;
  onSend: () => void;
  isSending: boolean;
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

export function RequestPanel({ request, onChange, onSend, isSending, onRegenerateBody }: Props) {
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
                <div key={name} className="grid grid-cols-[140px_1fr] gap-2 items-center">
                  <span className="text-xs font-mono text-zinc-400">{name}</span>
                  <input
                    value={request.pathParams[name] ?? ""}
                    onChange={(e) => updatePathParam(name, e.target.value)}
                    placeholder={`Value for {${name}}`}
                    className="px-2 py-1.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs font-mono focus:outline-none focus:border-cyan-500/50"
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
