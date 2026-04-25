import { entities, type SeedContext } from "../entities";
import type { Backend, Endpoint, RequestState } from "../types";
import { extractPathParamNames } from "./httpClient";
import { generateFromSchema } from "./schemaToPayload";

/** Convert the hardcoded `entities` list into Endpoint records (all CRUD operations). */
export function endpointsFromHardcoded(): Endpoint[] {
  const out: Endpoint[] = [];

  for (const e of entities) {
    const backend = e.backend as Backend;
    const tag = e.name;
    const base = e.endpoint;
    const withId = `${base}/{id}`;

    // POST — Create
    out.push({
      id: `POST ${base}`,
      method: "POST",
      path: base,
      backend,
      tag,
      summary: `Create ${tag}`,
      parameters: [],
      requestBody: { schema: undefined, example: undefined },
      source: "hardcoded",
    });

    // GET — List all
    out.push({
      id: `GET ${base}`,
      method: "GET",
      path: base,
      backend,
      tag,
      summary: `List ${tag}`,
      parameters: [],
      requestBody: undefined,
      source: "hardcoded",
    });

    // GET — Get by ID
    out.push({
      id: `GET ${withId}`,
      method: "GET",
      path: withId,
      backend,
      tag,
      summary: `Get ${tag} by ID`,
      parameters: [],
      requestBody: undefined,
      source: "hardcoded",
    });

    // PATCH — Partial update
    out.push({
      id: `PATCH ${withId}`,
      method: "PATCH",
      path: withId,
      backend,
      tag,
      summary: `Update ${tag}`,
      parameters: [],
      requestBody: { schema: undefined, example: undefined },
      source: "hardcoded",
    });

    // PUT — Full update
    out.push({
      id: `PUT ${withId}`,
      method: "PUT",
      path: withId,
      backend,
      tag,
      summary: `Replace ${tag}`,
      parameters: [],
      requestBody: { schema: undefined, example: undefined },
      source: "hardcoded",
    });

    // DELETE — Delete by ID
    out.push({
      id: `DELETE ${withId}`,
      method: "DELETE",
      path: withId,
      backend,
      tag,
      summary: `Delete ${tag}`,
      parameters: [],
      requestBody: undefined,
      source: "hardcoded",
    });
  }

  return out;
}

/**
 * Build a sample request body for an endpoint. Tries:
 *   1. Hardcoded entity payload (best for SWIVL)
 *   2. Schema-based generation (Swagger)
 *   3. Empty object
 */
export function generateBodyForEndpoint(
  endpoint: Endpoint,
  ctx: SeedContext,
): unknown {
  if (endpoint.source === "hardcoded") {
    const basePath = endpoint.path.replace(/\/\{id\}$/, "");
    const entity = entities.find((e) => e.endpoint === basePath && ["POST", "PUT", "PATCH"].includes(endpoint.method));
    if (entity) {
      try {
        return entity.payload(ctx);
      } catch {
        return {};
      }
    }
  }
  if (endpoint.requestBody?.example) return endpoint.requestBody.example;
  if (endpoint.requestBody?.schema) return generateFromSchema(endpoint.requestBody.schema);
  return {};
}

/**
 * Build a default RequestState for an endpoint, with sample body and
 * placeholder pathParams ready for the user to fill.
 */
export function buildRequestStateFromEndpoint(
  endpoint: Endpoint,
  ctx: SeedContext,
  baseUrl: string,
): RequestState {
  const pathParamNames = extractPathParamNames(endpoint.path);
  const pathParams: Record<string, string> = {};
  for (const name of pathParamNames) pathParams[name] = "";

  // Pre-fill query parameters described by the endpoint schema
  const queryParams = endpoint.parameters
    .filter((p) => p.in === "query")
    .map((p) => ({
      key: p.name,
      value: "",
      enabled: p.required,
    }));

  const headers = endpoint.parameters
    .filter((p) => p.in === "header")
    .map((p) => ({
      key: p.name,
      value: "",
      enabled: p.required,
    }));

  const hasBody = ["POST", "PUT", "PATCH"].includes(endpoint.method);
  const body = hasBody ? JSON.stringify(generateBodyForEndpoint(endpoint, ctx), null, 2) : "";

  return {
    endpointId: endpoint.id,
    method: endpoint.method,
    baseUrl,
    path: endpoint.path,
    pathParams,
    queryParams,
    headers,
    body,
  };
}

/** Stub SeedContext for use in Explorer (no real prior IDs). */
export function stubContext(): SeedContext {
  return {
    pickId: (e) => `<${e}-id>`,
    pickRelated: (p, s) => `<${p}.${s}-id>`,
    getIds: () => [],
  };
}
