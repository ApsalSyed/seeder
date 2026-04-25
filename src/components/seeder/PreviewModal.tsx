import { useMemo } from "react";
import type { Entity, SeedContext } from "../../entities";

type Props = {
  entity: Entity;
  onClose: () => void;
};

export function PreviewModal({ entity, onClose }: Props) {
  const payload = useMemo(() => {
    // Stub ctx — returns placeholder IDs so preview works for entities with deps
    const ctx: SeedContext = {
      pickId: (e) => `<${e}-id>`,
      pickRelated: (p, s) => `<${p}.${s}-id>`,
      getIds: () => [],
    };
    try {
      return JSON.stringify(entity.payload(ctx), null, 2);
    } catch (err) {
      return `// Error generating preview:\n// ${err instanceof Error ? err.message : String(err)}`;
    }
  }, [entity]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-zinc-100 font-semibold">Preview payload</h2>
            <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
              POST {entity.endpoint} <span className="text-zinc-600">·</span> {entity.backend}
            </p>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition flex items-center justify-center"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-auto log-scroll p-5">
          <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap break-words">
            {payload}
          </pre>
        </div>
        <div className="px-5 py-3 border-t border-zinc-800 flex justify-between items-center">
          <p className="text-[11px] text-zinc-500">
            Dependency IDs shown as <code className="text-cyan-400">&lt;entity-id&gt;</code> placeholders.
          </p>
          <button
            onClick={() => {
              navigator.clipboard.writeText(payload);
            }}
            className="text-xs px-3 py-1.5 rounded-md border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition"
          >
            Copy JSON
          </button>
        </div>
      </div>
    </div>
  );
}
