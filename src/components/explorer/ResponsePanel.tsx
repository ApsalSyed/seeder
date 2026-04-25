import { useState } from "react";
import type { ResponseState } from "../../types";

type Props = {
  response: ResponseState | { error: string; durationMs: number; url: string; timestamp: string } | null;
  isSending: boolean;
};

type ViewMode = "pretty" | "raw" | "headers";

export function ResponsePanel({ response, isSending }: Props) {
  const [view, setView] = useState<ViewMode>("pretty");
  const [copyState, setCopyState] = useState<string | null>(null);

  if (isSending && !response) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center">
        <div className="inline-block size-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-xs text-zinc-500">Sending request…</p>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
        <p className="text-xs text-zinc-500">Response will appear here.</p>
      </div>
    );
  }

  const isError = "error" in response;
  const status = isError ? 0 : response.status;
  const statusColor =
    isError || status >= 500
      ? "text-rose-400"
      : status >= 400
        ? "text-amber-400"
        : status >= 200
          ? "text-emerald-400"
          : "text-zinc-400";

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyState(label);
    setTimeout(() => setCopyState(null), 1500);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg flex flex-col">
      <div className="px-3 py-2.5 border-b border-zinc-800 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-mono font-bold ${statusColor}`}>
            {isError ? "ERR" : `${status} ${response.statusText}`}
          </span>
          <span className="text-[11px] text-zinc-500">·</span>
          <span className="text-[11px] text-zinc-400 font-mono tabular-nums">
            {response.durationMs}ms
          </span>
          {!isError && (
            <>
              <span className="text-[11px] text-zinc-500">·</span>
              <span className="text-[11px] text-zinc-400 font-mono tabular-nums">
                {formatBytes(response.size)}
              </span>
            </>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1">
          {!isError && (
            <>
              <ViewBtn active={view === "pretty"} onClick={() => setView("pretty")}>
                Pretty
              </ViewBtn>
              <ViewBtn active={view === "raw"} onClick={() => setView("raw")}>
                Raw
              </ViewBtn>
              <ViewBtn active={view === "headers"} onClick={() => setView("headers")}>
                Headers
              </ViewBtn>
              <button
                onClick={() => handleCopy(response.rawText, "body")}
                className="text-[11px] px-2 py-1 rounded border border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800 ml-1"
              >
                {copyState === "body" ? "✓" : "Copy"}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="px-3 py-1 border-b border-zinc-800 text-[10px] font-mono text-zinc-500 truncate">
        {response.url}
      </div>

      <div className="p-3 max-h-[600px] overflow-auto log-scroll">
        {isError ? (
          <div className="text-xs font-mono text-rose-300 bg-rose-500/5 border border-rose-500/20 rounded p-3 whitespace-pre-wrap">
            {response.error}
          </div>
        ) : view === "pretty" ? (
          <pre className="text-xs font-mono text-zinc-200 whitespace-pre-wrap break-words">
            {prettyPrint(response.body, response.rawText)}
          </pre>
        ) : view === "raw" ? (
          <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap break-all">
            {response.rawText || "(empty)"}
          </pre>
        ) : (
          <div className="space-y-1 text-xs font-mono">
            {Object.entries(response.headers).map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <span className="text-zinc-500 min-w-[140px]">{k}:</span>
                <span className="text-zinc-300 break-all">{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ViewBtn({
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
      className={`text-[11px] px-2 py-1 rounded transition ${
        active ? "bg-zinc-700 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

function prettyPrint(body: unknown, rawText: string): string {
  if (typeof body === "string") return body || "(empty)";
  try {
    return JSON.stringify(body, null, 2);
  } catch {
    return rawText;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}
