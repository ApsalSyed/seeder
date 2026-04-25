import { useState } from "react";
import type { Backend, Endpoint, SwaggerSource } from "../../types";
import { fetchSwaggerSpec, parseOpenApiSpec } from "../../api/swagger";

type Props = {
  swaggerSources: SwaggerSource[];
  setSwaggerSources: (s: SwaggerSource[]) => void;
  swaggerEndpoints: Record<string, Endpoint[]>; // url → endpoints
  setSwaggerEndpoints: (m: Record<string, Endpoint[]>) => void;
  baseUrls: { v1: string; revamp: string };
};

export function ApiSourceConfig({
  swaggerSources,
  setSwaggerSources,
  swaggerEndpoints,
  setSwaggerEndpoints,
  baseUrls,
}: Props) {
  const [url, setUrl] = useState("");
  const [backend, setBackend] = useState<Backend>("v1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);

  const handleImport = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setOkMessage(null);
    try {
      const spec = await fetchSwaggerSpec(url.trim());
      const parsed = parseOpenApiSpec(spec, backend, {
        v1Base: baseUrls.v1,
        revampBase: baseUrls.revamp,
      });
      if (!parsed.endpoints.length) {
        throw new Error("Spec parsed but contained no endpoints");
      }
      const newSource: SwaggerSource = {
        url: url.trim(),
        backend,
        fetchedAt: new Date().toISOString(),
        endpointCount: parsed.endpoints.length,
      };
      const others = swaggerSources.filter((s) => s.url !== newSource.url);
      setSwaggerSources([...others, newSource]);
      setSwaggerEndpoints({ ...swaggerEndpoints, [newSource.url]: parsed.endpoints });
      setOkMessage(
        `Imported ${parsed.endpoints.length} endpoints from ${parsed.title ?? "spec"} (${parsed.version})`,
      );
      setUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = (sourceUrl: string) => {
    setSwaggerSources(swaggerSources.filter((s) => s.url !== sourceUrl));
    const next = { ...swaggerEndpoints };
    delete next[sourceUrl];
    setSwaggerEndpoints(next);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">API source</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Hardcoded SWIVL entities are always available. Add Swagger/OpenAPI URLs for full CRUD coverage.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_auto] gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.example.com/swagger.json"
          className="px-3 py-2 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/50 font-mono"
        />
        <select
          value={backend}
          onChange={(e) => setBackend(e.target.value as Backend)}
          className="px-3 py-2 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm"
        >
          <option value="v1">Use v1 base URL</option>
          <option value="revamp">Use revamp base URL</option>
          <option value="custom">Use spec's URL</option>
        </select>
        <button
          onClick={handleImport}
          disabled={loading || !url.trim()}
          className="px-4 py-2 rounded-md bg-cyan-500 text-zinc-950 text-sm font-medium hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {loading ? "Importing…" : "Import"}
        </button>
      </div>

      {error && (
        <div className="mt-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded px-2 py-1.5 font-mono">
          {error}
        </div>
      )}
      {okMessage && (
        <div className="mt-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-1.5">
          {okMessage}
        </div>
      )}

      {swaggerSources.length > 0 && (
        <div className="mt-3 space-y-1">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-1">
            Imported sources
          </div>
          {swaggerSources.map((s) => (
            <div
              key={s.url}
              className="flex items-center justify-between bg-zinc-950/60 border border-zinc-800 rounded px-2 py-1.5"
            >
              <div className="min-w-0 flex-1">
                <div className="text-xs font-mono text-zinc-300 truncate">{s.url}</div>
                <div className="text-[10px] text-zinc-500">
                  {s.endpointCount} endpoints · backend: {s.backend} · imported{" "}
                  {new Date(s.fetchedAt).toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => handleRemove(s.url)}
                className="text-xs text-rose-300 hover:text-rose-200 px-2"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
