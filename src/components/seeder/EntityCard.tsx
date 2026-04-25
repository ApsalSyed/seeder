import type { Entity } from "../../entities";
import type { EntityUIState } from "../../types";

type Props = {
  entity: Entity;
  state: EntityUIState;
  onChange: (state: EntityUIState) => void;
  onPreview: () => void;
};

export function EntityCard({ entity, state, onChange, onPreview }: Props) {
  const backendColor =
    entity.backend === "v1"
      ? "text-blue-300 bg-blue-500/10 border-blue-500/20"
      : "text-violet-300 bg-violet-500/10 border-violet-500/20";

  return (
    <div
      className={`rounded-lg border transition ${
        state.enabled
          ? "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
          : "bg-zinc-900/40 border-zinc-800/50 opacity-60"
      }`}
    >
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-zinc-100 font-semibold tracking-tight truncate">{entity.name}</h3>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono uppercase ${backendColor}`}>
              {entity.backend}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 font-mono truncate" title={entity.endpoint}>
            POST {entity.endpoint}
          </p>
        </div>
        <Toggle checked={state.enabled} onChange={(v) => onChange({ ...state, enabled: v })} />
      </div>

      <div className="px-4 pb-4 space-y-3">
        <div className="flex items-center gap-2">
          <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium flex-1">
            Count
          </label>
          <div className="flex items-center gap-1">
            <StepBtn onClick={() => onChange({ ...state, count: Math.max(0, state.count - 1) })}>
              −
            </StepBtn>
            <input
              type="number"
              min={0}
              value={state.count}
              onChange={(e) =>
                onChange({ ...state, count: Math.max(0, Number(e.target.value) || 0) })
              }
              disabled={!state.enabled}
              className="w-16 text-center px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm font-mono focus:outline-none focus:border-cyan-500/50 disabled:opacity-50"
            />
            <StepBtn onClick={() => onChange({ ...state, count: state.count + 1 })}>+</StepBtn>
          </div>
        </div>

        {entity.dependsOn && entity.dependsOn.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider text-zinc-600">deps:</span>
            {entity.dependsOn.map((d) => (
              <span
                key={d}
                className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono border border-zinc-700/50"
              >
                {d}
              </span>
            ))}
          </div>
        )}

        <button
          onClick={onPreview}
          className="w-full text-xs font-medium px-3 py-1.5 rounded-md bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
        >
          Preview payload →
        </button>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 inline-flex h-5 w-9 items-center rounded-full transition ${
        checked ? "bg-cyan-500" : "bg-zinc-700"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function StepBtn({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="size-6 rounded border border-zinc-800 bg-zinc-900 text-zinc-400 text-sm hover:bg-zinc-800 hover:text-zinc-200 transition"
    >
      {children}
    </button>
  );
}
