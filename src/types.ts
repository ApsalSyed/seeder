// ─── Existing seeder types ─────────────────────────────────────────────────────

export type LogLevel = "success" | "error" | "skipped" | "info";

export type LogEntry = {
  id: string;
  timestamp: string;
  level: LogLevel;
  entity: string;
  index?: number;
  status?: number;
  message: string;
};

export type Result = {
  entity: string;
  createdIds: string[];
  failed: number;
  total: number;
};

export type AuthScheme = "Bearer" | "Basic" | "Custom";

export type Config = {
  baseUrlV1: string;
  baseUrlRevamp: string;
  token: string;
  authScheme: AuthScheme;
  customHeaderName: string;
};

export type Environment = {
  id: string;
  name: string;
  color: string;
  config: Config;
};

export type EntityUIState = {
  name: string;
  enabled: boolean;
  count: number;
};

export type RunOptions = {
  sequential: boolean;
  delay: number;
};

// ─── New: Endpoint registry ────────────────────────────────────────────────────

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type Backend = "v1" | "revamp" | "custom";

export type ParamLocation = "path" | "query" | "header";

export type EndpointParam = {
  name: string;
  in: ParamLocation;
  required: boolean;
  schema?: any;
  description?: string;
  example?: unknown;
};

export type Endpoint = {
  id: string;
  method: HttpMethod;
  path: string;
  backend: Backend;
  customBaseUrl?: string;
  tag?: string;
  summary?: string;
  parameters: EndpointParam[];
  requestBody?: {
    schema?: any;
    example?: unknown;
  };
  source: "hardcoded" | "swagger" | "manual";
};

export type SwaggerSource = {
  url: string;
  backend: Backend;
  fetchedAt: string;
  endpointCount: number;
};

// ─── New: Explorer ─────────────────────────────────────────────────────────────

export type KeyValueRow = { key: string; value: string; enabled: boolean };

export type RequestState = {
  endpointId?: string;
  method: HttpMethod;
  baseUrl: string;
  path: string;
  pathParams: Record<string, string>;
  queryParams: KeyValueRow[];
  headers: KeyValueRow[];
  body: string;
};

export type ResponseState = {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  rawText: string;
  durationMs: number;
  size: number;
  url: string;
  timestamp: string;
};

export type HistoryEntry = {
  id: string;
  request: RequestState;
  response: ResponseState | { error: string; timestamp: string; durationMs: number; url: string };
  timestamp: string;
};

// ─── New: Workflows ────────────────────────────────────────────────────────────

export type AssertionOp = "status_eq" | "status_in" | "body_has" | "body_eq";

export type Assertion = {
  op: AssertionOp;
  target: string;
  value: string;
};

export type StepKind = "request" | "list_pick";

export type WorkflowStep = {
  id: string;
  name: string;
  kind: StepKind;
  request?: RequestState;
  assertions?: Assertion[];
  extracts?: { from: string; as: string }[];
  listPick?: {
    request: RequestState;
    itemsPath: string;
    idField: string;
    selectionMode: "all" | "manual";
    pickedIds?: string[];
  };
};

export type WorkflowStepResult = {
  stepId: string;
  ok: boolean;
  status?: number;
  durationMs: number;
  message: string;
  response?: unknown;
  selectedIds?: string[];
  failedAssertions?: string[];
};

export type Workflow = {
  id: string;
  name: string;
  steps: WorkflowStep[];
  createdAt: string;
};

export type Tab = "seeder" | "explorer" | "workflows";
