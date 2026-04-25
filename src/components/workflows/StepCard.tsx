import { useState } from "react";
import type {
  Assertion,
  AssertionOp,
  Endpoint,
  RequestState,
  WorkflowStep,
  WorkflowStepResult,
} from "../../types";
import { resolveBaseUrl } from "../../api/httpClient";
import { buildRequestStateFromEndpoint, stubContext } from "../../api/registry";
import { RequestPanel } from "../explorer/RequestPanel";
import type { Config } from "../../types";

type Props = {
  step: WorkflowStep;
  index: number;
  onChange: (s: WorkflowStep) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  endpoints: Endpoint[];
  config: Config;
  result?: WorkflowStepResult;
  isRunning: boolean;
};

export function StepCard({
  step,
  index,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  endpoints,
  config,
  result,
  isRunning,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const [showEndpointPicker, setShowEndpointPicker] = useState(false);
  const [filter, setFilter] = useState("");

  const handlePickEndpoint = (e: Endpoint) => {
    const baseUrl = resolveBaseUrl(e.backend, config, e.customBaseUrl);
    const ctx = stubContext();
    const req = buildRequestStateFromEndpoint(e, ctx, baseUrl);
    if (step.kind === "list_pick") {
      onChange({
        ...step,
        listPick: {
          ...(step.listPick ?? {
            itemsPath: "data",
            idField: "id",
            selectionMode: "all",
          }),
          request: req,
        },
      });
    } else {
      onChange({ ...step, request: req });
    }
    setShowEndpointPicker(false);
  };

  const filteredEndpoints = endpoints.filter((e) =>
    !filter
      ? true
      : `${e.method} ${e.path} ${e.tag} ${e.summary}`.toLowerCase().includes(filter.toLowerCase()),
  );

  const statusColor = result
    ? result.ok
      ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
      : "text-rose-400 border-rose-500/30 bg-rose-500/10"
    : isRunning
      ? "text-cyan-400 border-cyan-500/30 bg-cyan-500/10"
      : "text-zinc-500 border-zinc-700 bg-zinc-800/40";

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b border-zinc-800 flex items-center gap-2">
        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${statusColor}`}>
          {result ? (result.ok ? "✓" : "✗") : isRunning ? "…" : index + 1}
        </span>
        <input
          value={step.name}
          onChange={(e) => onChange({ ...step, name: e.target.value })}
          className="flex-1 bg-transparent border-none text-sm text-zinc-100 font-semibold focus:outline-none focus:ring-0"
          placeholder="Step name"
        />
        <select
          value={step.kind}
          onChange={(e) => onChange({ ...step, kind: e.target.value as any })}
          className="px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-xs text-zinc-300"
        >
          <option value="request">Request</option>
          <option value="list_pick">List & Pick</option>
        </select>
        <div className="flex gap-0.5">
          <IconBtn onClick={onMoveUp} title="Move up">↑</IconBtn>
          <IconBtn onClick={onMoveDown} title="Move down">↓</IconBtn>
          <IconBtn onClick={() => setExpanded(!expanded)} title={expanded ? "Collapse" : "Expand"}>
            {expanded ? "−" : "+"}
          </IconBtn>
          <IconBtn onClick={onRemove} title="Remove" danger>×</IconBtn>
        </div>
      </div>

      {result && (
        <div
          className={`px-3 py-1.5 text-[11px] font-mono border-b border-zinc-800 ${
            result.ok ? "text-emerald-300" : "text-rose-300"
          }`}
        >
          {result.status && <span className="font-bold mr-2">{result.status}</span>}
          {result.message}
          {result.durationMs > 0 && (
            <span className="text-zinc-500 ml-2">({result.durationMs}ms)</span>
          )}
        </div>
      )}

      {expanded && (
        <div className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowEndpointPicker(!showEndpointPicker)}
              className="text-xs px-2.5 py-1 rounded border border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800"
            >
              {showEndpointPicker ? "Hide" : "Pick from registry"}
            </button>
            <span className="text-[10px] text-zinc-500 font-mono">
              Use{" "}
              <code className="text-cyan-400">{"${stepName.varName}"}</code> to reference earlier
              extracts
            </span>
          </div>

          {showEndpointPicker && (
            <div className="bg-zinc-950 border border-zinc-800 rounded">
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter…"
                className="w-full px-2 py-1.5 bg-transparent border-b border-zinc-800 text-xs text-zinc-100 focus:outline-none"
              />
              <div className="max-h-48 overflow-auto log-scroll">
                {filteredEndpoints.slice(0, 50).map((e) => (
                  <button
                    key={e.id}
                    onClick={() => handlePickEndpoint(e)}
                    className="w-full text-left px-2 py-1.5 hover:bg-zinc-800/50 flex items-center gap-2 border-b border-zinc-800/50"
                  >
                    <span className="text-[10px] font-mono font-bold w-12 text-cyan-300">
                      {e.method}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-300 truncate flex-1">
                      {e.path}
                    </span>
                  </button>
                ))}
                {filteredEndpoints.length > 50 && (
                  <div className="px-2 py-1 text-[10px] text-zinc-600">
                    ... {filteredEndpoints.length - 50} more, refine filter
                  </div>
                )}
              </div>
            </div>
          )}

          {step.kind === "request" && step.request && (
            <>
              <RequestPanel
                request={step.request}
                onChange={(r) => onChange({ ...step, request: r })}
                onSend={() => {}} // step send is via workflow runner
                isSending={false}
              />
              <ExtractsEditor
                extracts={step.extracts ?? []}
                onChange={(extracts) => onChange({ ...step, extracts })}
              />
              <AssertionsEditor
                assertions={step.assertions ?? []}
                onChange={(assertions) => onChange({ ...step, assertions })}
              />
            </>
          )}

          {step.kind === "list_pick" && (
            <ListPickConfig
              step={step}
              onChange={onChange}
            />
          )}
        </div>
      )}
    </div>
  );
}

function IconBtn({
  onClick,
  title,
  children,
  danger,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`size-7 rounded text-sm transition ${
        danger
          ? "text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10"
          : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
      }`}
    >
      {children}
    </button>
  );
}

function ExtractsEditor({
  extracts,
  onChange,
}: {
  extracts: { from: string; as: string }[];
  onChange: (e: { from: string; as: string }[]) => void;
}) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2 font-semibold">
        Extract variables
      </div>
      {extracts.map((e, i) => (
        <div key={i} className="flex gap-2 mb-1.5 items-center">
          <input
            value={e.from}
            onChange={(ev) =>
              onChange(extracts.map((x, idx) => (idx === i ? { ...x, from: ev.target.value } : x)))
            }
            placeholder="data.id"
            className="flex-1 px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-100 focus:outline-none focus:border-cyan-500/50"
          />
          <span className="text-zinc-500 text-xs">→</span>
          <input
            value={e.as}
            onChange={(ev) =>
              onChange(extracts.map((x, idx) => (idx === i ? { ...x, as: ev.target.value } : x)))
            }
            placeholder="customerId"
            className="flex-1 px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-100 focus:outline-none focus:border-cyan-500/50"
          />
          <button
            onClick={() => onChange(extracts.filter((_, idx) => idx !== i))}
            className="text-zinc-500 hover:text-rose-400 px-2"
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...extracts, { from: "data.id", as: "id" }])}
        className="text-[11px] px-2 py-1 rounded border border-dashed border-zinc-700 text-zinc-400 hover:text-zinc-200 w-full"
      >
        + Add extract
      </button>
    </div>
  );
}

function AssertionsEditor({
  assertions,
  onChange,
}: {
  assertions: Assertion[];
  onChange: (a: Assertion[]) => void;
}) {
  const ops: { value: AssertionOp; label: string }[] = [
    { value: "status_eq", label: "Status =" },
    { value: "status_in", label: "Status in" },
    { value: "body_has", label: "Body has" },
    { value: "body_eq", label: "Body =" },
  ];
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2 font-semibold">
        Assertions
      </div>
      {assertions.map((a, i) => (
        <div key={i} className="flex gap-2 mb-1.5 items-center">
          <select
            value={a.op}
            onChange={(ev) =>
              onChange(
                assertions.map((x, idx) => (idx === i ? { ...x, op: ev.target.value as AssertionOp } : x)),
              )
            }
            className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-100"
          >
            {ops.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {(a.op === "body_has" || a.op === "body_eq") && (
            <input
              value={a.target}
              onChange={(ev) =>
                onChange(
                  assertions.map((x, idx) => (idx === i ? { ...x, target: ev.target.value } : x)),
                )
              }
              placeholder="data.id"
              className="flex-1 px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-100 focus:outline-none focus:border-cyan-500/50"
            />
          )}
          <input
            value={a.value}
            onChange={(ev) =>
              onChange(assertions.map((x, idx) => (idx === i ? { ...x, value: ev.target.value } : x)))
            }
            placeholder={a.op === "status_in" ? "200,201" : "value"}
            className="flex-1 px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-100 focus:outline-none focus:border-cyan-500/50"
          />
          <button
            onClick={() => onChange(assertions.filter((_, idx) => idx !== i))}
            className="text-zinc-500 hover:text-rose-400 px-2"
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...assertions, { op: "status_eq", target: "", value: "200" }])}
        className="text-[11px] px-2 py-1 rounded border border-dashed border-zinc-700 text-zinc-400 hover:text-zinc-200 w-full"
      >
        + Add assertion
      </button>
    </div>
  );
}

function ListPickConfig({
  step,
  onChange,
}: {
  step: WorkflowStep;
  onChange: (s: WorkflowStep) => void;
}) {
  const lp = step.listPick ?? {
    request: {
      method: "GET" as const,
      baseUrl: "",
      path: "/",
      pathParams: {},
      queryParams: [],
      headers: [],
      body: "",
    },
    itemsPath: "data",
    idField: "id",
    selectionMode: "all" as const,
  };

  return (
    <div className="space-y-3">
      <RequestPanel
        request={lp.request}
        onChange={(r) => onChange({ ...step, listPick: { ...lp, request: r } })}
        onSend={() => {}}
        isSending={false}
      />
      <div className="bg-zinc-950 border border-zinc-800 rounded p-2.5 grid grid-cols-1 md:grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
            Items path
          </label>
          <input
            value={lp.itemsPath}
            onChange={(e) =>
              onChange({ ...step, listPick: { ...lp, itemsPath: e.target.value } })
            }
            placeholder="data.results"
            className="w-full mt-1 px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-100 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
            ID field
          </label>
          <input
            value={lp.idField}
            onChange={(e) =>
              onChange({ ...step, listPick: { ...lp, idField: e.target.value } })
            }
            placeholder="id"
            className="w-full mt-1 px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-100 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
            Selection
          </label>
          <select
            value={lp.selectionMode}
            onChange={(e) =>
              onChange({
                ...step,
                listPick: { ...lp, selectionMode: e.target.value as "all" | "manual" },
              })
            }
            className="w-full mt-1 px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-100"
          >
            <option value="all">All items</option>
            <option value="manual">Manual (use pickedIds)</option>
          </select>
        </div>
      </div>
      <p className="text-[10px] text-zinc-500 font-mono">
        Reference picked IDs in next steps via{" "}
        <code className="text-cyan-400">{`\${${step.name}.ids}`}</code>. If used in path/body, the
        step iterates over each ID.
      </p>
    </div>
  );
}
