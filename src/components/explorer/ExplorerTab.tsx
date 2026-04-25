import { useMemo, useState } from "react";
import type { Config, Endpoint, HistoryEntry, RequestState, ResponseState, SwaggerSource } from "../../types";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { resolveBaseUrl, sendRequest } from "../../api/httpClient";
import { buildRequestStateFromEndpoint, endpointsFromHardcoded, stubContext } from "../../api/registry";
import { ApiSourceConfig } from "./ApiSourceConfig";
import { EndpointList } from "./EndpointList";
import { RequestPanel } from "./RequestPanel";
import { ResponsePanel } from "./ResponsePanel";

type Props = {
  config: Config;
};

const EMPTY_REQUEST = (baseUrl: string): RequestState => ({
  method: "GET",
  baseUrl,
  path: "/",
  pathParams: {},
  queryParams: [],
  headers: [],
  body: "",
});

export function ExplorerTab({ config }: Props) {
  const [swaggerSources, setSwaggerSources] = useLocalStorage<SwaggerSource[]>(
    "explorer.swaggerSources",
    [],
  );
  const [swaggerEndpoints, setSwaggerEndpoints] = useLocalStorage<Record<string, Endpoint[]>>(
    "explorer.swaggerEndpoints",
    {},
  );
  const [showSourceConfig, setShowSourceConfig] = useState(false);

  const allEndpoints = useMemo(() => {
    const fromHardcoded = endpointsFromHardcoded();
    const fromSwagger = Object.values(swaggerEndpoints).flat();
    return [...fromHardcoded, ...fromSwagger];
  }, [swaggerEndpoints]);

  const [request, setRequest] = useState<RequestState>(() => EMPTY_REQUEST(config.baseUrlV1));
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | undefined>();
  const [response, setResponse] = useState<ResponseState | { error: string; durationMs: number; url: string; timestamp: string } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const handleSelectEndpoint = (e: Endpoint) => {
    const baseUrl = resolveBaseUrl(e.backend, config, e.customBaseUrl);
    const ctx = stubContext();
    const newRequest = buildRequestStateFromEndpoint(e, ctx, baseUrl);
    setRequest(newRequest);
    setSelectedEndpointId(e.id);
    setResponse(null);
  };

  const handleRegenerateBody = () => {
    if (!selectedEndpointId) return;
    const endpoint = allEndpoints.find((e) => e.id === selectedEndpointId);
    if (!endpoint) return;
    const ctx = stubContext();
    const fresh = buildRequestStateFromEndpoint(endpoint, ctx, request.baseUrl);
    setRequest({ ...request, body: fresh.body });
  };

  const handleSend = async () => {
    setIsSending(true);
    setResponse(null);
    const result = await sendRequest(request, config);
    if (result.ok) {
      setResponse(result.response);
      setHistory((prev) =>
        [
          {
            id: Math.random().toString(36).slice(2),
            request: { ...request },
            response: result.response,
            timestamp: result.response.timestamp,
          },
          ...prev,
        ].slice(0, 30),
      );
    } else {
      const errResp = {
        error: result.error,
        durationMs: result.durationMs,
        url: result.url,
        timestamp: result.timestamp,
      };
      setResponse(errResp);
      setHistory((prev) =>
        [
          {
            id: Math.random().toString(36).slice(2),
            request: { ...request },
            response: errResp,
            timestamp: result.timestamp,
          },
          ...prev,
        ].slice(0, 30),
      );
    }
    setIsSending(false);
  };

  const handleHistoryClick = (entry: HistoryEntry) => {
    setRequest(entry.request);
    setSelectedEndpointId(entry.request.endpointId);
    setResponse("error" in entry.response ? entry.response : entry.response);
  };

  return (
    <div className="mx-auto max-w-7xl w-full px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-zinc-100 text-base font-semibold">Explorer</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {allEndpoints.length} endpoints loaded ·{" "}
            {endpointsFromHardcoded().length} hardcoded ·{" "}
            {Object.values(swaggerEndpoints).flat().length} from Swagger
          </p>
        </div>
        <button
          onClick={() => setShowSourceConfig(!showSourceConfig)}
          className="text-xs px-3 py-1.5 rounded border border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800 transition"
        >
          {showSourceConfig ? "Hide" : "Manage"} sources ({swaggerSources.length})
        </button>
      </div>

      {showSourceConfig && (
        <div className="mb-4">
          <ApiSourceConfig
            swaggerSources={swaggerSources}
            setSwaggerSources={setSwaggerSources}
            swaggerEndpoints={swaggerEndpoints}
            setSwaggerEndpoints={setSwaggerEndpoints}
            baseUrls={{ v1: config.baseUrlV1, revamp: config.baseUrlRevamp }}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 mb-4">
        <div className="h-[600px]">
          <EndpointList
            endpoints={allEndpoints}
            selectedId={selectedEndpointId}
            onSelect={handleSelectEndpoint}
          />
        </div>
        <div className="space-y-4">
          <RequestPanel
            request={request}
            onChange={setRequest}
            onSend={handleSend}
            isSending={isSending}
            onRegenerateBody={selectedEndpointId ? handleRegenerateBody : undefined}
          />
          <ResponsePanel response={response} isSending={isSending} />
        </div>
      </div>

      {history.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
          <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
              History
            </h3>
            <button
              onClick={() => setHistory([])}
              className="text-[11px] text-zinc-500 hover:text-zinc-300"
            >
              Clear
            </button>
          </div>
          <div className="max-h-48 overflow-auto log-scroll">
            {history.map((h) => {
              const isErr = "error" in h.response;
              const status = isErr ? 0 : (h.response as ResponseState).status;
              const duration = isErr
                ? (h.response as { durationMs: number }).durationMs
                : (h.response as ResponseState).durationMs;
              const statusColor = isErr || status >= 500
                ? "text-rose-400"
                : status >= 400
                  ? "text-amber-400"
                  : "text-emerald-400";
              return (
                <button
                  key={h.id}
                  onClick={() => handleHistoryClick(h)}
                  className="w-full text-left px-3 py-2 hover:bg-zinc-800/40 border-b border-zinc-800/50 last:border-0 flex items-center gap-3"
                >
                  <span className="text-[10px] text-zinc-600 font-mono tabular-nums shrink-0">
                    {new Date(h.timestamp).toLocaleTimeString("en-US", { hour12: false })}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-zinc-300 w-12 shrink-0">
                    {h.request.method}
                  </span>
                  <span className={`text-[11px] font-mono w-10 shrink-0 ${statusColor}`}>
                    {isErr ? "ERR" : status}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-400 truncate flex-1">
                    {h.request.path}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono tabular-nums shrink-0">
                    {isErr ? "-" : `${duration}ms`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
