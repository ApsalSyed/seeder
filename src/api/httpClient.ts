import type { Config, RequestState, ResponseState } from "../types";

export function buildAuthHeaders(config: Config): Record<string, string> {
  const headers: Record<string, string> = {};
  if (!config.token) return headers;
  switch (config.authScheme) {
    case "Bearer":
      headers["Authorization"] = `Bearer ${config.token}`;
      break;
    case "Basic":
      headers["Authorization"] = `Basic ${config.token}`;
      break;
    case "Custom":
      if (config.customHeaderName.trim()) {
        headers[config.customHeaderName.trim()] = config.token;
      }
      break;
  }
  return headers;
}

export function resolveBaseUrl(
  backend: "v1" | "revamp" | "custom",
  config: Config,
  customBaseUrl?: string,
): string {
  if (backend === "v1") return config.baseUrlV1;
  if (backend === "revamp") return config.baseUrlRevamp;
  return customBaseUrl ?? "";
}

export function applyPathParams(path: string, params: Record<string, string>): string {
  let result = path;
  for (const [k, v] of Object.entries(params)) {
    if (!v) continue;
    result = result.split(`{${k}}`).join(encodeURIComponent(v));
    result = result.split(`:${k}`).join(encodeURIComponent(v));
  }
  return result;
}

export function buildUrl(req: RequestState): string {
  const base = req.baseUrl.replace(/\/$/, "");
  const path = applyPathParams(req.path, req.pathParams);
  const qs = req.queryParams
    .filter((q) => q.enabled && q.key)
    .map((q) => `${encodeURIComponent(q.key)}=${encodeURIComponent(q.value)}`)
    .join("&");
  return `${base}${path}${qs ? `?${qs}` : ""}`;
}

/** Extract path placeholders like /customers/{id}/addresses/:addrId → ["id", "addrId"] */
export function extractPathParamNames(path: string): string[] {
  const names: string[] = [];
  const re = /\{([^}]+)\}|:([A-Za-z_][A-Za-z0-9_]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(path))) names.push(m[1] ?? m[2]);
  return Array.from(new Set(names));
}

export type SendResult =
  | { ok: true; response: ResponseState }
  | { ok: false; error: string; durationMs: number; url: string; timestamp: string };

export async function sendRequest(req: RequestState, config: Config): Promise<SendResult> {
  const url = buildUrl(req);
  const startedAt = performance.now();
  const timestamp = new Date().toISOString();

  const auth = buildAuthHeaders(config);
  const customHeaders = Object.fromEntries(
    req.headers.filter((h) => h.enabled && h.key).map((h) => [h.key, h.value]),
  );
  const merged: Record<string, string> = {
    Accept: "application/json",
    ...auth,
    ...customHeaders,
  };

  const hasBody = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && req.body.trim().length > 0;
  let bodyToSend: string | undefined;
  if (hasBody) {
    if (!merged["Content-Type"]) merged["Content-Type"] = "application/json";
    bodyToSend = req.body;
  }

  try {
    const res = await fetch(url, {
      method: req.method,
      headers: merged,
      body: bodyToSend,
    });
    const durationMs = Math.round(performance.now() - startedAt);
    const rawText = await res.text();
    let parsed: unknown = rawText;
    try {
      parsed = rawText ? JSON.parse(rawText) : null;
    } catch {
      /* not JSON — keep raw */
    }
    const headers: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      headers[key] = value;
    });
    return {
      ok: true,
      response: {
        status: res.status,
        statusText: res.statusText,
        headers,
        body: parsed,
        rawText,
        durationMs,
        size: rawText.length,
        url,
        timestamp,
      },
    };
  } catch (err) {
    const durationMs = Math.round(performance.now() - startedAt);
    const msg = err instanceof Error ? err.message : String(err);
    const isCors = /failed to fetch|networkerror|load failed/i.test(msg);
    return {
      ok: false,
      error: isCors
        ? `Network error — likely CORS. Enable CORS on the backend or use the Vite dev proxy. (${msg})`
        : msg,
      durationMs,
      url,
      timestamp,
    };
  }
}

/** Walk an object via dot-path: getByPath({a:{b:[{c:1}]}}, "a.b.0.c") → 1 */
export function getByPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  const parts = path.split(".");
  let cur: any = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    if (Array.isArray(cur) && /^\d+$/.test(p)) cur = cur[Number(p)];
    else cur = cur[p];
  }
  return cur;
}
