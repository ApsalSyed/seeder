import { useMemo, useRef, useState } from "react";
import type {
  Config,
  Endpoint,
  RequestState,
  SwaggerSource,
  Workflow,
  WorkflowStep,
  WorkflowStepResult,
} from "../../types";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { endpointsFromHardcoded } from "../../api/registry";
import { runWorkflow } from "../../workflowRunner";
import { StepCard } from "./StepCard";

type Props = {
  config: Config;
};

const uid = () => Math.random().toString(36).slice(2, 10);

const blankRequest = (baseUrl: string): RequestState => ({
  method: "GET",
  baseUrl,
  path: "/",
  pathParams: {},
  queryParams: [],
  headers: [],
  body: "",
});

const blankWorkflow = (): Workflow => ({
  id: uid(),
  name: "New workflow",
  steps: [],
  createdAt: new Date().toISOString(),
});

export function WorkflowsTab({ config }: Props) {
  const [workflows, setWorkflows] = useLocalStorage<Workflow[]>("workflows.list", []);
  const [activeId, setActiveId] = useLocalStorage<string | null>("workflows.activeId", null);
  const [swaggerEndpoints] = useLocalStorage<Record<string, Endpoint[]>>(
    "explorer.swaggerEndpoints",
    {},
  );

  const [running, setRunning] = useState(false);
  const [stepResults, setStepResults] = useState<Record<string, WorkflowStepResult>>({});
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const abortRef = useRef(false);

  const allEndpoints = useMemo(() => {
    return [...endpointsFromHardcoded(), ...Object.values(swaggerEndpoints).flat()];
  }, [swaggerEndpoints]);

  const active = workflows.find((w) => w.id === activeId) ?? null;

  const updateActive = (patch: Partial<Workflow>) => {
    if (!active) return;
    setWorkflows(workflows.map((w) => (w.id === active.id ? { ...w, ...patch } : w)));
  };

  const updateStep = (stepId: string, patch: WorkflowStep) => {
    if (!active) return;
    updateActive({ steps: active.steps.map((s) => (s.id === stepId ? patch : s)) });
  };

  const addStep = (kind: "request" | "list_pick" = "request") => {
    if (!active) return;
    const newStep: WorkflowStep =
      kind === "request"
        ? {
            id: uid(),
            name: `step_${active.steps.length + 1}`,
            kind: "request",
            request: blankRequest(config.baseUrlV1),
            assertions: [{ op: "status_eq", target: "", value: "200" }],
            extracts: [],
          }
        : {
            id: uid(),
            name: `pick_${active.steps.length + 1}`,
            kind: "list_pick",
            listPick: {
              request: { ...blankRequest(config.baseUrlV1), method: "GET" },
              itemsPath: "data",
              idField: "id",
              selectionMode: "all",
            },
          };
    updateActive({ steps: [...active.steps, newStep] });
  };

  const removeStep = (id: string) => {
    if (!active) return;
    updateActive({ steps: active.steps.filter((s) => s.id !== id) });
  };

  const moveStep = (id: string, dir: -1 | 1) => {
    if (!active) return;
    const idx = active.steps.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= active.steps.length) return;
    const next = [...active.steps];
    [next[idx], next[target]] = [next[target], next[idx]];
    updateActive({ steps: next });
  };

  const handleRun = async () => {
    if (!active || active.steps.length === 0) return;
    abortRef.current = false;
    setRunning(true);
    setStepResults({});
    setActiveStepId(null);
    await runWorkflow(active, config, {
      onStepStart: (step) => setActiveStepId(step.id),
      onStepComplete: (result) =>
        setStepResults((prev) => ({ ...prev, [result.stepId]: result })),
      shouldAbort: () => abortRef.current,
    });
    setActiveStepId(null);
    setRunning(false);
  };

  const summary = useMemo(() => {
    const results = Object.values(stepResults);
    return {
      passed: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      total: results.length,
    };
  }, [stepResults]);

  return (
    <div className="mx-auto max-w-7xl w-full px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
        <div className="space-y-2">
          <button
            onClick={() => {
              const w = blankWorkflow();
              setWorkflows([...workflows, w]);
              setActiveId(w.id);
            }}
            className="w-full px-3 py-2 rounded bg-cyan-500 text-zinc-950 text-xs font-bold hover:bg-cyan-400 transition"
          >
            + New workflow
          </button>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            {workflows.length === 0 ? (
              <div className="p-3 text-xs text-zinc-500 text-center">No workflows yet</div>
            ) : (
              workflows.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setActiveId(w.id)}
                  className={`w-full text-left px-3 py-2 border-b border-zinc-800/50 last:border-0 transition ${
                    w.id === activeId ? "bg-zinc-800/60" : "hover:bg-zinc-800/30"
                  }`}
                >
                  <div className="text-sm text-zinc-200 font-medium truncate">{w.name}</div>
                  <div className="text-[10px] text-zinc-500">
                    {w.steps.length} step{w.steps.length === 1 ? "" : "s"}
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
            <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-2">
              Quick reference
            </h4>
            <ul className="text-[11px] text-zinc-400 space-y-1.5 leading-snug">
              <li>
                <code className="text-cyan-400">{`\${stepName.varName}`}</code> — value extracted
                from a previous step
              </li>
              <li>
                <code className="text-cyan-400">{`\${pickStep.ids}`}</code> — array of IDs from a
                list-pick step (iterates request)
              </li>
              <li>
                <code className="text-cyan-400">{`\${iter.id}`}</code> — current ID inside an
                iteration
              </li>
            </ul>
          </div>
        </div>

        <div className="min-w-0">
          {!active ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
              <p className="text-sm text-zinc-400 mb-1">Pick or create a workflow</p>
              <p className="text-xs text-zinc-600">
                Workflows chain requests together. Extract IDs from one response, use them in the
                next.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <input
                  value={active.name}
                  onChange={(e) => updateActive({ name: e.target.value })}
                  className="bg-transparent border-none text-lg font-semibold text-zinc-100 focus:outline-none focus:ring-0 px-0 flex-1 min-w-[200px]"
                />
                {summary.total > 0 && (
                  <div className="text-xs font-mono">
                    <span className="text-emerald-400">{summary.passed} ✓</span>
                    <span className="text-zinc-600 mx-1">·</span>
                    <span className="text-rose-400">{summary.failed} ✗</span>
                    <span className="text-zinc-600 mx-1">·</span>
                    <span className="text-zinc-400">
                      {summary.total}/{active.steps.length}
                    </span>
                  </div>
                )}
                {!running ? (
                  <button
                    onClick={handleRun}
                    disabled={active.steps.length === 0 || !config.token}
                    className="px-4 py-1.5 rounded bg-cyan-500 text-zinc-950 text-xs font-bold hover:bg-cyan-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Run workflow
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      abortRef.current = true;
                    }}
                    className="px-4 py-1.5 rounded bg-rose-500 text-white text-xs font-bold hover:bg-rose-400 transition"
                  >
                    Stop
                  </button>
                )}
                <button
                  onClick={() => {
                    if (confirm(`Delete workflow "${active.name}"?`)) {
                      setWorkflows(workflows.filter((w) => w.id !== active.id));
                      setActiveId(null);
                    }
                  }}
                  className="text-xs text-rose-300 hover:text-rose-200 px-2"
                >
                  Delete
                </button>
              </div>

              <div className="space-y-3">
                {active.steps.map((s, i) => (
                  <StepCard
                    key={s.id}
                    step={s}
                    index={i}
                    onChange={(patch) => updateStep(s.id, patch)}
                    onRemove={() => removeStep(s.id)}
                    onMoveUp={() => moveStep(s.id, -1)}
                    onMoveDown={() => moveStep(s.id, 1)}
                    endpoints={allEndpoints}
                    config={config}
                    result={stepResults[s.id]}
                    isRunning={running && activeStepId === s.id}
                  />
                ))}
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => addStep("request")}
                  disabled={running}
                  className="flex-1 px-3 py-2 rounded border border-dashed border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 text-xs transition"
                >
                  + Add request step
                </button>
                <button
                  onClick={() => addStep("list_pick")}
                  disabled={running}
                  className="flex-1 px-3 py-2 rounded border border-dashed border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 text-xs transition"
                >
                  + Add list-pick step
                </button>
              </div>

              {active.steps.length === 0 && (
                <div className="mt-4 text-center text-xs text-zinc-500">
                  Add steps to build a CRUD chain. Try: create → extract id → update → delete.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
