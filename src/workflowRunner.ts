import type {
  Config,
  RequestState,
  Workflow,
  WorkflowStep,
  WorkflowStepResult,
} from "./types";
import { getByPath, sendRequest } from "./api/httpClient";

/**
 * Substitute ${var.path.to.field} placeholders in a string with values from the
 * variables object. Supports dotted paths and array indices.
 */
function substitute(input: string, vars: Record<string, unknown>): string {
  return input.replace(/\$\{([^}]+)\}/g, (_, expr: string) => {
    const value = getByPath(vars, expr.trim());
    if (value == null) return "";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  });
}

function substituteRequest(req: RequestState, vars: Record<string, unknown>): RequestState {
  return {
    ...req,
    path: substitute(req.path, vars),
    pathParams: Object.fromEntries(
      Object.entries(req.pathParams).map(([k, v]) => [k, substitute(v, vars)]),
    ),
    queryParams: req.queryParams.map((q) => ({
      ...q,
      value: substitute(q.value, vars),
    })),
    headers: req.headers.map((h) => ({ ...h, value: substitute(h.value, vars) })),
    body: substitute(req.body, vars),
  };
}

function evalAssertion(
  assertion: { op: string; target: string; value: string },
  status: number,
  body: unknown,
): { ok: boolean; reason: string } {
  switch (assertion.op) {
    case "status_eq":
      return {
        ok: status === Number(assertion.value),
        reason: `expected status ${assertion.value}, got ${status}`,
      };
    case "status_in": {
      const expected = assertion.value.split(",").map((s) => Number(s.trim()));
      return {
        ok: expected.includes(status),
        reason: `expected status in [${expected.join(",")}], got ${status}`,
      };
    }
    case "body_has": {
      const v = getByPath(body, assertion.target);
      return { ok: v != null, reason: `body.${assertion.target} is missing` };
    }
    case "body_eq": {
      const v = getByPath(body, assertion.target);
      return {
        ok: String(v) === assertion.value,
        reason: `body.${assertion.target}: expected "${assertion.value}", got "${String(v)}"`,
      };
    }
    default:
      return { ok: false, reason: `unknown assertion: ${assertion.op}` };
  }
}

export type WorkflowCallbacks = {
  onStepStart: (step: WorkflowStep) => void;
  onStepComplete: (result: WorkflowStepResult) => void;
  shouldAbort: () => boolean;
};

export async function runWorkflow(
  workflow: Workflow,
  config: Config,
  cb: WorkflowCallbacks,
): Promise<WorkflowStepResult[]> {
  const results: WorkflowStepResult[] = [];
  const vars: Record<string, unknown> = {};
  const stepResponses: Record<string, unknown> = {};

  for (const step of workflow.steps) {
    if (cb.shouldAbort()) break;
    cb.onStepStart(step);

    if (step.kind === "list_pick") {
      const cfg = step.listPick!;
      const req = substituteRequest(cfg.request, { ...vars, steps: stepResponses });
      const result = await sendRequest(req, config);
      const stepStart = performance.now();

      if (!result.ok) {
        const r: WorkflowStepResult = {
          stepId: step.id,
          ok: false,
          durationMs: Math.round(performance.now() - stepStart),
          message: `[list_pick] ${result.error}`,
        };
        results.push(r);
        cb.onStepComplete(r);
        continue;
      }

      const items = getByPath(result.response.body, cfg.itemsPath);
      if (!Array.isArray(items)) {
        const r: WorkflowStepResult = {
          stepId: step.id,
          ok: false,
          status: result.response.status,
          durationMs: result.response.durationMs,
          message: `[list_pick] expected array at "${cfg.itemsPath}", got ${typeof items}`,
        };
        results.push(r);
        cb.onStepComplete(r);
        continue;
      }

      let selectedIds: string[];
      if (cfg.selectionMode === "manual" && cfg.pickedIds && cfg.pickedIds.length > 0) {
        selectedIds = cfg.pickedIds;
      } else {
        selectedIds = items
          .map((it: any) => getByPath(it, cfg.idField))
          .filter((v: unknown) => v != null)
          .map((v: unknown) => String(v));
      }

      vars[step.name] = { ids: selectedIds, items };
      stepResponses[step.id] = { ids: selectedIds, response: result.response.body };

      const r: WorkflowStepResult = {
        stepId: step.id,
        ok: true,
        status: result.response.status,
        durationMs: result.response.durationMs,
        message: `[list_pick] picked ${selectedIds.length} of ${items.length} items`,
        response: result.response.body,
        selectedIds,
      };
      results.push(r);
      cb.onStepComplete(r);
      continue;
    }

    // Regular request step — may iterate over a previous step's selected IDs
    const stepReq = step.request!;
    const idsToIterate = findIterationIds(stepReq, vars);

    if (idsToIterate && idsToIterate.length > 0) {
      // Iterate: substitute the iter id into the request for each one
      let anyFailed = false;
      let lastStatus: number | undefined;
      let totalDuration = 0;
      for (const id of idsToIterate) {
        if (cb.shouldAbort()) break;
        const itVars = { ...vars, steps: stepResponses, iter: { id } };
        const req = substituteRequest(stepReq, itVars);
        const result = await sendRequest(req, config);
        if (!result.ok) {
          anyFailed = true;
          totalDuration += result.durationMs;
          continue;
        }
        lastStatus = result.response.status;
        totalDuration += result.response.durationMs;
        if (result.response.status >= 400) anyFailed = true;
      }
      const r: WorkflowStepResult = {
        stepId: step.id,
        ok: !anyFailed,
        status: lastStatus,
        durationMs: totalDuration,
        message: anyFailed
          ? `iterated ${idsToIterate.length} ids — some failed`
          : `iterated ${idsToIterate.length} ids successfully`,
      };
      results.push(r);
      cb.onStepComplete(r);
      continue;
    }

    // Single request
    const req = substituteRequest(stepReq, { ...vars, steps: stepResponses });
    const result = await sendRequest(req, config);

    if (!result.ok) {
      const r: WorkflowStepResult = {
        stepId: step.id,
        ok: false,
        durationMs: result.durationMs,
        message: result.error,
      };
      results.push(r);
      cb.onStepComplete(r);
      continue;
    }

    // Run assertions
    const failedAssertions: string[] = [];
    for (const a of step.assertions ?? []) {
      const ev = evalAssertion(a, result.response.status, result.response.body);
      if (!ev.ok) failedAssertions.push(`${a.op}: ${ev.reason}`);
    }

    // Run extracts → write into vars under step.name
    const extractedVars: Record<string, unknown> = {};
    for (const ex of step.extracts ?? []) {
      extractedVars[ex.as] = getByPath(result.response.body, ex.from);
    }
    if (Object.keys(extractedVars).length > 0) {
      vars[step.name] = { ...((vars[step.name] as object) ?? {}), ...extractedVars };
    }
    stepResponses[step.id] = result.response.body;

    const ok = failedAssertions.length === 0 && result.response.status < 400;
    const r: WorkflowStepResult = {
      stepId: step.id,
      ok,
      status: result.response.status,
      durationMs: result.response.durationMs,
      message: ok
        ? `${result.response.status} ${result.response.statusText}`
        : `assertions failed: ${failedAssertions.join("; ")}`,
      response: result.response.body,
      failedAssertions: failedAssertions.length > 0 ? failedAssertions : undefined,
    };
    results.push(r);
    cb.onStepComplete(r);
  }

  return results;
}

/**
 * If the request references ${someStep.ids} or ${iter.id}, treat it as an
 * iterating request and return the ID list to loop over. Returns null otherwise.
 */
function findIterationIds(req: RequestState, vars: Record<string, unknown>): string[] | null {
  const text = JSON.stringify(req);
  // Look for references like ${stepName.ids}
  const re = /\$\{([A-Za-z_][A-Za-z0-9_]*)\.ids\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const stepName = m[1];
    const ids = (vars[stepName] as any)?.ids;
    if (Array.isArray(ids)) return ids;
  }
  return null;
}
