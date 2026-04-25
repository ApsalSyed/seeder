import type { Backend, Endpoint, EndpointParam, HttpMethod, ParamLocation } from "../types";

const METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export type ParsedSpec = {
  endpoints: Endpoint[];
  detectedBaseUrl?: string;
  version: "openapi3" | "swagger2" | "unknown";
  title?: string;
};

/** Resolve a JSON-Schema $ref to its underlying schema. */
function resolveRef(spec: any, ref: string): any {
  if (!ref?.startsWith?.("#/")) return undefined;
  const parts = ref.slice(2).split("/");
  let cur: any = spec;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

/**
 * Recursively expand $refs inside a schema. Limited depth to avoid runaway
 * recursion on circular schemas. Doesn't mutate the input.
 */
function expandRefs(spec: any, schema: any, depth = 0, seen = new Set<string>()): any {
  if (!schema || typeof schema !== "object" || depth > 6) return schema;
  if (schema.$ref) {
    if (seen.has(schema.$ref)) return { type: "object", description: `[circular: ${schema.$ref}]` };
    const next = new Set(seen);
    next.add(schema.$ref);
    const resolved = resolveRef(spec, schema.$ref);
    return expandRefs(spec, resolved, depth + 1, next);
  }
  if (Array.isArray(schema)) {
    return schema.map((s) => expandRefs(spec, s, depth + 1, seen));
  }
  const out: any = {};
  for (const [k, v] of Object.entries(schema)) {
    out[k] = expandRefs(spec, v, depth + 1, seen);
  }
  return out;
}

function parseParam(spec: any, raw: any): EndpointParam | null {
  const expanded = expandRefs(spec, raw);
  const inLoc = expanded.in as ParamLocation;
  if (!["path", "query", "header"].includes(inLoc)) return null; // skip cookie etc.
  return {
    name: expanded.name,
    in: inLoc,
    required: !!expanded.required,
    schema: expanded.schema ?? { type: expanded.type ?? "string" },
    description: expanded.description,
    example: expanded.example,
  };
}

function inferBackendFromUrl(url: string, v1Base?: string, revampBase?: string): Backend {
  if (v1Base && url.startsWith(v1Base)) return "v1";
  if (revampBase && url.startsWith(revampBase)) return "revamp";
  return "custom";
}

/**
 * Parse an OpenAPI 3.x or Swagger 2.0 spec into a flat list of Endpoint objects.
 * `defaultBackend` is used when we can't infer from the spec's `servers`.
 */
export function parseOpenApiSpec(
  spec: any,
  defaultBackend: Backend,
  options?: { v1Base?: string; revampBase?: string },
): ParsedSpec {
  if (!spec || typeof spec !== "object") {
    return { endpoints: [], version: "unknown" };
  }

  const isOpenApi3 = typeof spec.openapi === "string" && spec.openapi.startsWith("3.");
  const isSwagger2 = spec.swagger === "2.0";
  const version = isOpenApi3 ? "openapi3" : isSwagger2 ? "swagger2" : "unknown";
  const title = spec.info?.title;

  // Determine the spec's base URL
  let detectedBaseUrl: string | undefined;
  if (isOpenApi3 && Array.isArray(spec.servers) && spec.servers[0]?.url) {
    detectedBaseUrl = String(spec.servers[0].url);
  } else if (isSwagger2) {
    const scheme = spec.schemes?.[0] ?? "https";
    if (spec.host) detectedBaseUrl = `${scheme}://${spec.host}${spec.basePath ?? ""}`;
  }

  const inferredBackend = detectedBaseUrl
    ? inferBackendFromUrl(detectedBaseUrl, options?.v1Base, options?.revampBase)
    : defaultBackend;

  const endpoints: Endpoint[] = [];
  const paths = spec.paths ?? {};

  for (const [path, ops] of Object.entries<any>(paths)) {
    if (!ops || typeof ops !== "object") continue;
    const sharedParams: any[] = ops.parameters ?? [];
    for (const method of METHODS) {
      const op = ops[method.toLowerCase()];
      if (!op) continue;

      const allParams = [...sharedParams, ...(op.parameters ?? [])];
      const parameters: EndpointParam[] = [];
      for (const raw of allParams) {
        const p = parseParam(spec, raw);
        if (p) parameters.push(p);
      }

      // Request body — OpenAPI 3 uses `requestBody.content[mediaType].schema`,
      // Swagger 2 uses a parameter with `in: "body"`.
      let requestBody: Endpoint["requestBody"] | undefined;
      if (isOpenApi3 && op.requestBody) {
        const content = op.requestBody.content ?? {};
        const json =
          content["application/json"] ?? content[Object.keys(content)[0] as string];
        if (json) {
          requestBody = {
            schema: expandRefs(spec, json.schema),
            example: json.example,
          };
        }
      } else if (isSwagger2) {
        const bodyParam = (op.parameters ?? []).find((p: any) => p.in === "body");
        if (bodyParam) {
          requestBody = { schema: expandRefs(spec, bodyParam.schema) };
        }
      }

      const tag = op.tags?.[0] ?? path.split("/").filter(Boolean)[0];

      endpoints.push({
        id: `${method} ${path}`,
        method,
        path,
        backend: inferredBackend,
        customBaseUrl: inferredBackend === "custom" ? detectedBaseUrl : undefined,
        tag,
        summary: op.summary ?? op.operationId,
        parameters,
        requestBody,
        source: "swagger",
      });
    }
  }

  return { endpoints, detectedBaseUrl, version, title };
}

/**
 * Fetch a spec from a URL. Tries the URL as-is, then a few common
 * docs-vs-json variants if the first attempt returns HTML.
 */
export async function fetchSwaggerSpec(url: string): Promise<any> {
  const candidates = new Set<string>();
  candidates.add(url);
  // If the URL is /docs or /swagger (HTML UI), try the common JSON endpoints.
  if (/\/(docs|swagger)\/?$/.test(url)) {
    candidates.add(url.replace(/\/?$/, "-json"));
    candidates.add(url.replace(/\/(docs|swagger)\/?$/, "/api-docs-json"));
    candidates.add(url.replace(/\/(docs|swagger)\/?$/, "/swagger.json"));
    candidates.add(url.replace(/\/(docs|swagger)\/?$/, "/openapi.json"));
  }

  let lastErr = "";
  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate, { headers: { Accept: "application/json" } });
      if (!res.ok) {
        lastErr = `${candidate} → HTTP ${res.status}`;
        continue;
      }
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        lastErr = `${candidate} returned non-JSON (looks like an HTML page)`;
        continue;
      }
    } catch (err) {
      lastErr = `${candidate} → ${err instanceof Error ? err.message : String(err)}`;
    }
  }
  throw new Error(lastErr || "Could not fetch spec");
}
