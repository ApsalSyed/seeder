# Swivl API Toolkit

A local web app with three tabs for end-to-end API work:

- **Seeder** — bulk-create test data across the SWIVL `v1` and `revamp` backends, using hardcoded entity definitions.
- **Explorer** — pick any endpoint, edit headers / query / body, hit Send, see the response. Postman-style.
- **Workflows** — chain requests together (create → extract id → update → delete), with assertions and "list & pick" steps for delete operations.

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. Paste a bearer token in the top bar.

Base URLs, token, tab state, workflows, and per-tab settings persist to `localStorage`.

## Tab 1 — Seeder

Pick entities, set counts, hit **Seed selected**. Topologically sorts dependencies (e.g. customers before jobs), parses creation responses to extract IDs (including nested ones like `addresses[].id`), and fails soft on any single-record error. See `src/entities.ts` for the full registry of POST endpoints.

## Tab 2 — Explorer

Pick an endpoint from the registry on the left, or edit method/URL manually. The registry combines:

- **Hardcoded entities** — every POST defined in `entities.ts`, with auto-generated faker payloads.
- **Imported Swagger / OpenAPI specs** — click "Manage sources" to add one. The tool fetches the spec, resolves `$ref`s, and produces a flat list of every endpoint with realistic sample bodies generated from the JSON schemas.

The Swagger importer accepts URLs like:

- `https://api.example.com/swagger.json`
- `https://api.example.com/openapi.json`
- `https://api.example.com/api-docs-json`
- `https://api.example.com/swagger` (will try to find the JSON variant automatically)

After picking an endpoint, click **Regenerate sample** in the Body tab to get a fresh faker payload.

## Tab 3 — Workflows

Chain requests with variable passing. Two step types:

**Request step** — pick an endpoint, configure the request, optionally:
- Extract values from the response into named variables (e.g. `data.id` → `customerId`)
- Add assertions (status code, body field presence/equality)

**List & Pick step** — calls a GET endpoint, expects an array at a specified path (e.g. `data.results`), and produces a list of IDs that downstream steps can iterate over.

**Variable references** in any step's path/body/headers/query:

- `${stepName.varName}` — single value extracted from a previous step
- `${pickStepName.ids}` — array of IDs from a list-pick step (causes the step to iterate, sending one request per ID)
- `${iter.id}` — current ID inside an iteration

**Example: full CRUD chain**

1. `create` (POST `/customer`) — extract `data.id` as `id`
2. `read` (GET `/customer/${create.id}`) — assert status 200
3. `update` (PATCH `/customer/${create.id}`) — body uses `${create.id}`
4. `delete` (DELETE `/customer/${create.id}`) — assert status 204

**Example: bulk delete using list pick**

1. `existing_customers` — list-pick step calling GET `/customer`, items at `data.results`, ID field `id`, mode "all" or "manual"
2. `delete_each` — DELETE `/customer/${iter.id}` (body references `${existing_customers.ids}` → step iterates over each ID)

## CORS

Browsers block cross-origin requests unless the backend allows it. Two fixes:

**A. Enable CORS on the backend** (preferred). Add `http://localhost:5173` to your allowed origins.

**B. Use the Vite dev proxy.** Open `vite.config.ts`, uncomment the `server.proxy` block, and in the top bar set:

- V1 Backend URL → `/v1`
- Revamp Backend URL → `/revamp`

## Adding endpoints

The Seeder uses `src/entities.ts`. Add a new `Entity` to that array — it shows up automatically in both Seeder and Explorer.

For Explorer + Workflows on non-SWIVL APIs, just import a Swagger URL — no code changes needed.

## Architecture notes

- `src/api/httpClient.ts` — shared fetch wrapper used by Explorer and Workflows
- `src/api/swagger.ts` — OpenAPI 3.x and Swagger 2.0 parser with `$ref` resolution
- `src/api/schemaToPayload.ts` — JSON Schema → faker-generated sample payload
- `src/api/registry.ts` — unified endpoint list (hardcoded + Swagger)
- `src/runner.ts` — Seeder runner with topo sort and ID store
- `src/workflowRunner.ts` — Workflow runner with variable substitution

All state is in React + localStorage. No backend, no Redux, no external services.
# seeder
