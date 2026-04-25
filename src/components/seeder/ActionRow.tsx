import type { RunOptions } from "../../types";

type Props = {
  options: RunOptions;
  setOptions: (o: RunOptions) => void;
  isRunning: boolean;
  canSeed: boolean;
  progress: { done: number; total: number };
  onSeed: () => void;
  onStop: () => void;
  onResetCounts: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
};

export function ActionRow({
  options,
  setOptions,
  isRunning,
  canSeed,
  progress,
  onSeed,
  onStop,
  onResetCounts,
  onSelectAll,
  onDeselectAll,
}: Props) {
  const pct =
    progress.total > 0 ? Math.min(100, Math.round((progress.done / progress.total) * 100)) : 0;

  return (
    <div className="sticky bottom-0 z-40 border-t border-zinc-800 bg-zinc-900/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              {!isRunning ? (
                <button
                  onClick={onSeed}
                  disabled={!canSeed}
                  className="px-5 py-2.5 rounded-md bg-cyan-500 text-zinc-950 font-semibold text-sm hover:bg-cyan-400 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20"
                >
                  Seed selected
                </button>
              ) : (
                <button
                  onClick={onStop}
                  className="px-5 py-2.5 rounded-md bg-rose-500 text-white font-semibold text-sm hover:bg-rose-400 transition"
                >
                  Stop
                </button>
              )}
              <button
                onClick={onSelectAll}
                disabled={isRunning}
                className="px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800/50 text-zinc-300 text-xs hover:bg-zinc-800 transition disabled:opacity-50"
              >
                Select all
              </button>
              <button
                onClick={onDeselectAll}
                disabled={isRunning}
                className="px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800/50 text-zinc-300 text-xs hover:bg-zinc-800 transition disabled:opacity-50"
              >
                Deselect all
              </button>
              <button
                onClick={onResetCounts}
                disabled={isRunning}
                className="px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800/50 text-zinc-300 text-xs hover:bg-zinc-800 transition disabled:opacity-50"
              >
                Reset counts
              </button>
            </div>

            <div className="flex items-center gap-4 ml-auto">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.sequential}
                  onChange={(e) => setOptions({ ...options, sequential: e.target.checked })}
                  disabled={isRunning}
                  className="accent-cyan-500"
                />
                <span className="text-xs text-zinc-400">Sequential</span>
              </label>
              <div className="flex items-center gap-2 min-w-[180px]">
                <span className="text-[11px] uppercase tracking-wider text-zinc-500">Delay</span>
                <input
                  type="range"
                  min={0}
                  max={1000}
                  step={50}
                  value={options.delay}
                  onChange={(e) => setOptions({ ...options, delay: Number(e.target.value) })}
                  disabled={isRunning}
                  className="flex-1 accent-cyan-500"
                />
                <span className="text-xs text-zinc-400 font-mono tabular-nums w-14 text-right">
                  {options.delay}ms
                </span>
              </div>
            </div>
          </div>

          {(isRunning || progress.done > 0) && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-zinc-500">
                  {progress.done} / {progress.total}
                </span>
                <span className="text-cyan-400">{pct}%</span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-200"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
