import { useEffect, useRef } from "react";
import type { LogEntry } from "../../types";

type Props = {
  logs: LogEntry[];
  onClear: () => void;
};

const levelStyles: Record<LogEntry["level"], string> = {
  success: "text-emerald-400",
  error: "text-rose-400",
  skipped: "text-amber-400",
  info: "text-zinc-400",
};

const levelSymbols: Record<LogEntry["level"], string> = {
  success: "✓",
  error: "✕",
  skipped: "⚠",
  info: "›",
};

export function LogsPanel({ logs, onClear }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedToBottomRef = useRef(true);

  // Track whether the user has scrolled away from the bottom
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    pinnedToBottomRef.current = atBottom;
  };

  useEffect(() => {
    if (pinnedToBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `seeder-logs-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const counts = logs.reduce(
    (acc, l) => {
      acc[l.level]++;
      return acc;
    },
    { success: 0, error: 0, skipped: 0, info: 0 },
  );

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg flex flex-col h-[420px]">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-zinc-100 font-semibold text-sm">Logs</h2>
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <span className="text-emerald-400">{counts.success} ok</span>
            <span className="text-zinc-700">·</span>
            <span className="text-rose-400">{counts.error} err</span>
            <span className="text-zinc-700">·</span>
            <span className="text-amber-400">{counts.skipped} skip</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={logs.length === 0}
            className="text-xs px-2.5 py-1 rounded border border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800 transition disabled:opacity-40"
          >
            Export JSON
          </button>
          <button
            onClick={onClear}
            disabled={logs.length === 0}
            className="text-xs px-2.5 py-1 rounded border border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800 transition disabled:opacity-40"
          >
            Clear
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto log-scroll p-3 font-mono text-[11px] leading-5"
      >
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-600 text-xs">
            No activity yet. Hit "Seed selected" to begin.
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex gap-2 py-0.5 hover:bg-zinc-800/30 px-1 rounded">
              <span className="text-zinc-600 tabular-nums shrink-0">
                {new Date(log.timestamp).toLocaleTimeString("en-US", { hour12: false })}
              </span>
              <span className={`${levelStyles[log.level]} shrink-0 w-3`}>
                {levelSymbols[log.level]}
              </span>
              {log.status != null && (
                <span className="text-zinc-500 shrink-0 w-8">{log.status}</span>
              )}
              <span className={`${levelStyles[log.level]} break-all`}>{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
