import { useState } from "react";
import type { Result } from "../../types";

type Props = {
  results: Result[];
};

export function ResultsPanel({ results }: Props) {
  const [copiedEntity, setCopiedEntity] = useState<string | null>(null);

  const handleCopy = (r: Result) => {
    navigator.clipboard.writeText(JSON.stringify(r.createdIds, null, 2));
    setCopiedEntity(r.entity);
    setTimeout(() => setCopiedEntity(null), 1500);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg flex flex-col h-[420px]">
      <div className="px-4 py-3 border-b border-zinc-800">
        <h2 className="text-zinc-100 font-semibold text-sm">Results</h2>
        {results.length > 0 && (
          <p className="text-[11px] text-zinc-500 mt-0.5">
            {results.reduce((s, r) => s + r.createdIds.length, 0)} records created across{" "}
            {results.length} {results.length === 1 ? "entity" : "entities"}
          </p>
        )}
      </div>
      <div className="flex-1 overflow-auto log-scroll p-3 space-y-2">
        {results.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-600 text-xs">
            Results will appear here as entities complete.
          </div>
        ) : (
          results.map((r) => {
            const successCount = r.createdIds.length;
            const successRate =
              r.total > 0 ? Math.round((successCount / r.total) * 100) : 0;
            return (
              <div key={r.entity} className="bg-zinc-950/40 border border-zinc-800/70 rounded-md p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm text-zinc-100 font-semibold">{r.entity}</div>
                    <div className="text-[11px] text-zinc-500 font-mono">
                      <span className="text-emerald-400">{successCount}</span>
                      <span className="text-zinc-600"> / </span>
                      <span>{r.total}</span>
                      {r.failed > 0 && (
                        <>
                          <span className="text-zinc-600"> · </span>
                          <span className="text-rose-400">{r.failed} failed</span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopy(r)}
                    disabled={successCount === 0}
                    className={`text-[11px] px-2.5 py-1 rounded border transition disabled:opacity-40 ${
                      copiedEntity === r.entity
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                        : "border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800"
                    }`}
                  >
                    {copiedEntity === r.entity ? "Copied!" : "Copy IDs"}
                  </button>
                </div>
                <div className="h-1 bg-zinc-800 rounded overflow-hidden">
                  <div
                    className={`h-full ${
                      successRate === 100
                        ? "bg-emerald-500"
                        : successRate >= 50
                          ? "bg-amber-500"
                          : "bg-rose-500"
                    }`}
                    style={{ width: `${successRate}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
