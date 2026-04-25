import { useMemo, useRef, useState } from "react";
import { entities as allEntities, type Entity } from "../../entities";
import { seed } from "../../runner";
import type { Config, EntityUIState, LogEntry, Result, RunOptions } from "../../types";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { EntityCard } from "./EntityCard";
import { PreviewModal } from "./PreviewModal";
import { ActionRow } from "./ActionRow";
import { LogsPanel } from "./LogsPanel";
import { ResultsPanel } from "./ResultsPanel";

type Props = {
  config: Config;
};

const buildDefaultStates = (): EntityUIState[] =>
  allEntities.map((e) => ({ name: e.name, enabled: true, count: e.defaultCount }));

export function SeederTab({ config }: Props) {
  const [states, setStates] = useLocalStorage<EntityUIState[]>(
    "seeder.states",
    buildDefaultStates(),
  );
  const [options, setOptions] = useLocalStorage<RunOptions>("seeder.options", {
    sequential: true,
    delay: 100,
  });

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [isRunning, setIsRunning] = useState(false);
  const [previewEntity, setPreviewEntity] = useState<Entity | null>(null);
  const abortRef = useRef(false);

  const reconciledStates = useMemo<EntityUIState[]>(() => {
    const byName = new Map(states.map((s) => [s.name, s]));
    return allEntities.map(
      (e) => byName.get(e.name) ?? { name: e.name, enabled: true, count: e.defaultCount },
    );
  }, [states]);

  const updateState = (name: string, patch: Partial<EntityUIState>) => {
    setStates(reconciledStates.map((s) => (s.name === name ? { ...s, ...patch } : s)));
  };

  const selectAll = () => setStates(reconciledStates.map((s) => ({ ...s, enabled: true })));
  const deselectAll = () => setStates(reconciledStates.map((s) => ({ ...s, enabled: false })));
  const resetCounts = () => setStates(buildDefaultStates());

  const anySelected = reconciledStates.some((s) => s.enabled && s.count > 0);
  const canSeed = !isRunning && anySelected && config.token.length > 0;

  const handleSeed = async () => {
    abortRef.current = false;
    setIsRunning(true);
    setLogs([]);
    setResults([]);
    setProgress({ done: 0, total: 0 });
    try {
      await seed(allEntities, reconciledStates, config, options, {
        onLog: (entry) => setLogs((prev) => [...prev, entry]),
        onProgress: (done, total) => setProgress({ done, total }),
        onResult: (result) => setResults((prev) => [...prev, result]),
        shouldAbort: () => abortRef.current,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLogs((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).slice(2),
          timestamp: new Date().toISOString(),
          level: "error",
          entity: "runner",
          message: `Fatal: ${msg}`,
        },
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleStop = () => {
    abortRef.current = true;
  };

  const byBackend = useMemo(() => {
    const v1 = allEntities.filter((e) => e.backend === "v1");
    const revamp = allEntities.filter((e) => e.backend === "revamp");
    return { v1, revamp };
  }, []);

  const getState = (name: string) =>
    reconciledStates.find((s) => s.name === name) ?? {
      name,
      enabled: true,
      count: 10,
    };

  return (
    <>
      <div className="mx-auto max-w-7xl w-full px-6 py-6 pb-32">
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] uppercase tracking-wider text-blue-300 font-semibold">
              v1 backend
            </span>
            <span className="text-[11px] text-zinc-600">·</span>
            <span className="text-[11px] text-zinc-500 font-mono truncate">
              {config.baseUrlV1 || "(not set)"}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {byBackend.v1.map((e) => (
              <EntityCard
                key={e.name}
                entity={e}
                state={getState(e.name)}
                onChange={(s) => updateState(e.name, s)}
                onPreview={() => setPreviewEntity(e)}
              />
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] uppercase tracking-wider text-violet-300 font-semibold">
              revamp backend
            </span>
            <span className="text-[11px] text-zinc-600">·</span>
            <span className="text-[11px] text-zinc-500 font-mono truncate">
              {config.baseUrlRevamp || "(not set)"}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-8">
            {byBackend.revamp.map((e) => (
              <EntityCard
                key={e.name}
                entity={e}
                state={getState(e.name)}
                onChange={(s) => updateState(e.name, s)}
                onPreview={() => setPreviewEntity(e)}
              />
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
          <LogsPanel logs={logs} onClear={() => setLogs([])} />
          <ResultsPanel results={results} />
        </section>

        {!config.token && (
          <div className="mt-4 px-4 py-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
            No token set. Paste a bearer token in the top bar before seeding.
          </div>
        )}
      </div>

      <ActionRow
        options={options}
        setOptions={setOptions}
        isRunning={isRunning}
        canSeed={canSeed}
        progress={progress}
        onSeed={handleSeed}
        onStop={handleStop}
        onResetCounts={resetCounts}
        onSelectAll={selectAll}
        onDeselectAll={deselectAll}
      />

      {previewEntity && (
        <PreviewModal entity={previewEntity} onClose={() => setPreviewEntity(null)} />
      )}
    </>
  );
}
