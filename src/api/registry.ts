import { entities, type SeedContext } from "../entities";
import type { Backend, Endpoint, EndpointParam, RequestState } from "../types";
import { extractPathParamNames } from "./httpClient";
import { generateFromSchema } from "./schemaToPayload";

// ─── Helper ────────────────────────────────────────────────────────────────────

function ep(
  method: Endpoint["method"],
  path: string,
  backend: Backend,
  tag: string,
  summary: string,
  opts?: { queryParams?: string[]; hasBody?: boolean },
): Endpoint {
  const params: EndpointParam[] = (opts?.queryParams ?? []).map((name) => ({
    name,
    in: "query" as const,
    required: false,
  }));
  return {
    id: `${method} ${path}`,
    method,
    path,
    backend,
    tag,
    summary,
    parameters: params,
    requestBody: opts?.hasBody ? { schema: undefined, example: undefined } : undefined,
    source: "hardcoded",
  };
}

// ─── Full endpoint registry — sourced from Swivl FE codebase ───────────────────

const allHardcodedEndpoints: Endpoint[] = [
  // ─── TAGS (v1) ─────────────────────────────────────────────────────────────
  ep("GET", "/api/v1/tags", "v1", "tags", "List tags", {
    queryParams: ["page", "limit", "orderByKey", "orderByValue", "searchBy", "value", "type", "status", "searchText"],
  }),
  ep("GET", "/api/v1/tags/{tagId}", "v1", "tags", "Get tag by ID"),
  ep("POST", "/api/v1/tags", "v1", "tags", "Create tag", { hasBody: true }),
  ep("PUT", "/api/v1/tags/{tagId}", "v1", "tags", "Update tag", { hasBody: true }),
  ep("GET", "/api/v1/tags/filter-list", "v1", "tags", "Filter tags list", {
    queryParams: ["type"],
  }),

  // ─── ZONES (v1) ────────────────────────────────────────────────────────────
  ep("GET", "/api/v1/zones", "v1", "zones", "List zones", {
    queryParams: ["page", "limit", "searchBy", "searchText", "sortBy", "sortOrder", "status", "orderByValue", "orderByKey"],
  }),
  ep("POST", "/api/v1/zones", "v1", "zones", "Create zone", { hasBody: true }),
  ep("GET", "/api/v1/zones/{zoneId}", "v1", "zones", "Get zone by ID"),
  ep("PUT", "/api/v1/zones/{zoneId}", "v1", "zones", "Update zone", { hasBody: true }),

  // ─── VEHICLES (v1) ─────────────────────────────────────────────────────────
  ep("GET", "/api/v1/vehicles", "v1", "vehicles", "List vehicles", {
    queryParams: ["page", "limit", "searchBy", "searchText", "orderByKey", "orderByValue", "status"],
  }),
  ep("POST", "/api/v1/vehicles", "v1", "vehicles", "Create vehicle", { hasBody: true }),
  ep("GET", "/api/v1/vehicles/{vehicleId}", "v1", "vehicles", "Get vehicle by ID"),
  ep("PUT", "/api/v1/vehicles/{vehicleId}", "v1", "vehicles", "Update vehicle", { hasBody: true }),
  ep("DELETE", "/api/v1/vehicles/{vehicleId}", "v1", "vehicles", "Delete vehicle"),
  ep("GET", "/api/v1/vehicles/cost", "v1", "vehicles", "Get vehicle cost", {
    queryParams: ["vin", "state"],
  }),

  // ─── EQUIPMENT (v1) ────────────────────────────────────────────────────────
  ep("GET", "/api/v1/equipment", "v1", "equipment", "List equipment", {
    queryParams: ["page", "limit", "orderByKey", "orderByValue", "searchBy", "searchText", "status"],
  }),
  ep("POST", "/api/v1/equipment", "v1", "equipment", "Create equipment", { hasBody: true }),
  ep("GET", "/api/v1/equipment/{equipmentId}", "v1", "equipment", "Get equipment by ID"),
  ep("PUT", "/api/v1/equipment/{equipmentId}", "v1", "equipment", "Update equipment", { hasBody: true }),
  ep("DELETE", "/api/v1/equipment/{equipmentId}", "v1", "equipment", "Delete equipment"),

  // ─── USER ROLES (v1) ───────────────────────────────────────────────────────
  ep("GET", "/api/v1/permission/role", "v1", "userRoles", "List roles", {
    queryParams: ["orderByKey", "orderByValue"],
  }),
  ep("GET", "/api/v1/permission/role/{roleId}", "v1", "userRoles", "Get role by ID"),
  ep("POST", "/api/v1/permission/role", "v1", "userRoles", "Create role", { hasBody: true }),
  ep("PUT", "/api/v1/permission/role/{roleId}", "v1", "userRoles", "Update role", { hasBody: true }),
  ep("DELETE", "/api/v1/permission/role/{roleId}", "v1", "userRoles", "Delete role"),
  ep("GET", "/api/v1/permission/resources", "v1", "userRoles", "List permission resources"),

  // ─── JOBS (v1) ─────────────────────────────────────────────────────────────
  ep("POST", "/api/v1/jobs", "v1", "jobs", "Create job", { hasBody: true }),
  ep("GET", "/api/v1/jobs/{jobId}", "v1", "jobs", "Get job by ID"),
  ep("PUT", "/api/v1/jobs/{jobId}", "v1", "jobs", "Update job", { hasBody: true }),
  ep("PATCH", "/api/v1/jobs/{jobId}", "v1", "jobs", "Patch job", { hasBody: true }),
  ep("POST", "/api/v1/jobs/close", "v1", "jobs", "Close job", { hasBody: true }),
  ep("POST", "/api/v1/jobs/jobNote", "v1", "jobs", "Add job note", { hasBody: true }),
  ep("GET", "/api/v1/jobs/activities/{jobId}", "v1", "jobs", "Get job activities", {
    queryParams: ["page", "limit", "activityType", "text", "fromDate", "toDate"],
  }),

  // ─── TASKS (v1) ────────────────────────────────────────────────────────────
  ep("POST", "/api/v1/task", "v1", "tasks", "Create task", { hasBody: true }),
  ep("GET", "/api/v1/task/{taskId}", "v1", "tasks", "Get task by ID"),
  ep("PUT", "/api/v1/task/{taskId}", "v1", "tasks", "Update task", { hasBody: true }),
  ep("PATCH", "/api/v1/task/{taskId}", "v1", "tasks", "Patch task", { hasBody: true }),
  ep("POST", "/api/v1/task/clockIn", "v1", "tasks", "Clock in", { hasBody: true }),
  ep("POST", "/api/v1/task/clockOut", "v1", "tasks", "Clock out", { hasBody: true }),
  ep("POST", "/api/v1/task/forceClockOut", "v1", "tasks", "Force clock out", { hasBody: true }),
  ep("POST", "/api/v1/task/close", "v1", "tasks", "Close task", { hasBody: true }),
  ep("GET", "/api/v1/task/activities/{taskId}", "v1", "tasks", "Get task activities"),
  ep("GET", "/api/v1/task/assistants", "v1", "tasks", "Get task assistants", {
    queryParams: ["assignedTechnicianId"],
  }),

  // ─── ESTIMATES (v1) ────────────────────────────────────────────────────────
  ep("GET", "/api/v1/estimate", "v1", "estimates", "List estimates", {
    queryParams: ["page", "limit", "orderByKey", "orderByValue", "status", "customer", "searchBy", "searchText", "startDateTime", "endDateTime", "job", "createdBy", "jobType"],
  }),
  ep("GET", "/api/v1/estimate/{id}", "v1", "estimates", "Get estimate by ID"),
  ep("POST", "/api/v1/estimate", "v1", "estimates", "Create estimate", { hasBody: true }),
  ep("PUT", "/api/v1/estimate/{id}", "v1", "estimates", "Update estimate", { hasBody: true }),
  ep("PATCH", "/api/v1/estimate/{id}", "v1", "estimates", "Patch estimate", { hasBody: true }),
  ep("GET", "/api/v1/estimate/view", "v1", "estimates", "View estimate"),
  ep("GET", "/api/v1/estimate/summary", "v1", "estimates", "Estimate summary"),
  ep("GET", "/api/v1/estimate/download/{estimateId}", "v1", "estimates", "Download estimate"),
  ep("POST", "/api/v1/estimate/send", "v1", "estimates", "Send estimate", { hasBody: true }),
  ep("PUT", "/api/v1/estimate/void/{id}", "v1", "estimates", "Void estimate"),
  ep("POST", "/api/v1/estimate/status", "v1", "estimates", "Update estimate status", { hasBody: true }),
  ep("POST", "/api/v1/estimate/convertToJob", "v1", "estimates", "Convert to job", { hasBody: true }),
  ep("PUT", "/api/v1/estimate/margin/{estimateId}", "v1", "estimates", "Update margin", { hasBody: true }),
  ep("POST", "/api/v1/estimate/signature", "v1", "estimates", "Add signature", { hasBody: true }),

  // ─── INVOICES (v1) ─────────────────────────────────────────────────────────
  ep("GET", "/api/v1/invoice", "v1", "invoices", "List invoices", {
    queryParams: ["page", "limit", "orderByKey", "orderByValue", "status", "searchBy", "searchText", "startDateTime", "endDateTime", "job", "customer", "createdBy", "jobType"],
  }),
  ep("GET", "/api/v1/invoice/{invoiceId}", "v1", "invoices", "Get invoice by ID"),
  ep("POST", "/api/v1/invoice", "v1", "invoices", "Create invoice", { hasBody: true }),
  ep("PUT", "/api/v1/invoice/{invoiceId}", "v1", "invoices", "Update invoice", { hasBody: true }),
  ep("PATCH", "/api/v1/invoice/{invoiceId}", "v1", "invoices", "Patch invoice", { hasBody: true }),
  ep("GET", "/api/v1/invoice/view", "v1", "invoices", "View invoice"),
  ep("GET", "/api/v1/invoice/summary", "v1", "invoices", "Invoice summary"),
  ep("GET", "/api/v1/invoice/download/{invoiceId}", "v1", "invoices", "Download invoice"),
  ep("PUT", "/api/v1/invoice/void/{invoiceId}", "v1", "invoices", "Void invoice"),
  ep("POST", "/api/v1/invoice/send", "v1", "invoices", "Send invoice", { hasBody: true }),
  ep("POST", "/api/v1/invoice/signature", "v1", "invoices", "Add signature", { hasBody: true }),
  ep("POST", "/api/v1/invoice/convertToJob", "v1", "invoices", "Convert to job", { hasBody: true }),
  ep("PUT", "/api/v1/invoice/margin/{invoiceId}", "v1", "invoices", "Update margin", { hasBody: true }),
  ep("POST", "/api/v1/invoice/settings", "v1", "invoices", "Update settings", { hasBody: true }),
  ep("DELETE", "/api/v1/invoice/media/{id}", "v1", "invoices", "Delete invoice media"),

  // ─── WORKORDER MEDIA (v1) ──────────────────────────────────────────────────
  ep("POST", "/api/v1/workorder/media", "v1", "workorderMedia", "Upload media", { hasBody: true }),
  ep("GET", "/api/v1/workorder/media", "v1", "workorderMedia", "List media", {
    queryParams: ["page", "limit", "jobId", "taskId", "invoiceId", "estimateId", "mediaType"],
  }),
  ep("DELETE", "/api/v1/workorder/media/{id}", "v1", "workorderMedia", "Delete media", {
    queryParams: ["type"],
  }),
  ep("POST", "/api/v1/workorder/media/import", "v1", "workorderMedia", "Import media", { hasBody: true }),

  // ─── CRM ACCOUNTS (v1) ────────────────────────────────────────────────────
  ep("GET", "/api/v1/crm/account", "v1", "crmAccounts", "List CRM accounts", {
    queryParams: ["page", "limit", "orderBy", "accountType", "searchBy", "value", "status", "tags", "zones"],
  }),
  ep("GET", "/api/v1/crm/account/{accountId}", "v1", "crmAccounts", "Get CRM account by ID"),
  ep("POST", "/api/v1/crm/account", "v1", "crmAccounts", "Create CRM account", { hasBody: true }),
  ep("PUT", "/api/v1/crm/account/{accountId}", "v1", "crmAccounts", "Update CRM account", { hasBody: true }),
  ep("GET", "/api/v1/crm/account/address", "v1", "crmAccounts", "Search account address", {
    queryParams: ["fullAddress"],
  }),
  ep("GET", "/api/v1/crm/account/global", "v1", "crmAccounts", "Global account search", {
    queryParams: ["name", "phoneNumber"],
  }),
  ep("GET", "/api/v1/crm/account/defaultCostMarkup/{accountId}", "v1", "crmAccounts", "Get default cost markup"),
  ep("PUT", "/api/v1/crm/account/{accountId}/sms", "v1", "crmAccounts", "Update SMS config", { hasBody: true }),
  ep("GET", "/api/v1/crm/account/{accountId}/sms", "v1", "crmAccounts", "Get SMS config"),
  ep("POST", "/api/v1/crm/account/{accountId}/file", "v1", "crmAccounts", "Upload file", { hasBody: true }),
  ep("DELETE", "/api/v1/crm/account/{accountId}/file", "v1", "crmAccounts", "Delete file", { hasBody: true }),

  // ─── CRM CONTACTS (v1) ────────────────────────────────────────────────────
  ep("GET", "/api/v1/crm/contact", "v1", "crmContacts", "List CRM contacts", {
    queryParams: ["page", "limit", "orderBy", "accountType", "searchBy", "value", "accountId"],
  }),
  ep("GET", "/api/v1/crm/contact/{contactId}", "v1", "crmContacts", "Get CRM contact by ID"),
  ep("POST", "/api/v1/crm/contact", "v1", "crmContacts", "Create CRM contact", { hasBody: true }),
  ep("PUT", "/api/v1/crm/contact/{contactId}", "v1", "crmContacts", "Update CRM contact", { hasBody: true }),
  ep("DELETE", "/api/v1/crm/contact", "v1", "crmContacts", "Delete CRM contact", { hasBody: true }),
  ep("GET", "/api/v1/crm/contact/assosiatedAccounts", "v1", "crmContacts", "Get associated accounts", {
    queryParams: ["primaryMobile"],
  }),
  ep("POST", "/api/v1/crm/contact/checkDuplicates", "v1", "crmContacts", "Check duplicates", { hasBody: true }),
  ep("POST", "/api/v1/crm/contact/merge", "v1", "crmContacts", "Merge contacts", { hasBody: true }),

  // ─── CUSTOMERS (revamp) ───────────────────────────────────────────────────
  ep("GET", "/customer", "revamp", "customers", "List customers", {
    queryParams: ["page", "limit", "searchText", "sortBy", "sortOrder", "searchBy"],
  }),
  ep("GET", "/customer/{id}", "revamp", "customers", "Get customer by ID"),
  ep("POST", "/customer", "revamp", "customers", "Create customer", { hasBody: true }),
  ep("PUT", "/customer/{id}", "revamp", "customers", "Update customer", { hasBody: true }),
  ep("PATCH", "/customer/{id}", "revamp", "customers", "Patch customer", { hasBody: true }),
  ep("DELETE", "/customer/{id}", "revamp", "customers", "Delete customer", { hasBody: true }),
  ep("GET", "/customer/counts", "revamp", "customers", "Get customer counts"),
  ep("GET", "/customer/search", "revamp", "customers", "Search customers", {
    queryParams: ["name", "fullAddress"],
  }),
  ep("GET", "/customer/contact", "revamp", "customers", "Search contacts", {
    queryParams: ["name"],
  }),
  ep("GET", "/customer/site-address", "revamp", "customers", "List site addresses"),
  ep("GET", "/customer/{id}/price-books", "revamp", "customers", "Get price books", {
    queryParams: ["page", "limit", "searchText"],
  }),
  ep("PUT", "/customer/{id}/price-books/{priceBookId}", "revamp", "customers", "Update price book", { hasBody: true }),
  ep("GET", "/customer/{id}/cost-markup", "revamp", "customers", "Get cost markup"),
  ep("PUT", "/customer/{id}/cost-markup", "revamp", "customers", "Update cost markup", { hasBody: true }),
  ep("GET", "/customer/{id}/financialSummary", "revamp", "customers", "Get financial summary"),
  ep("POST", "/customer/{id}/address", "revamp", "customers", "Add address", { hasBody: true }),
  ep("POST", "/customer/{id}/contact", "revamp", "customers", "Add contact", { hasBody: true }),
  ep("GET", "/customer/{id}/activities", "revamp", "customers", "Get activities"),
  ep("PUT", "/customer/{id}/sms", "revamp", "customers", "Update SMS config", { hasBody: true }),
  ep("GET", "/customer/{id}/sms", "revamp", "customers", "Get SMS config"),

  // ─── SUPPLIERS (revamp) ───────────────────────────────────────────────────
  ep("GET", "/supplier", "revamp", "suppliers", "List suppliers", {
    queryParams: ["page", "limit", "searchText", "sortBy", "sortOrder", "searchBy"],
  }),
  ep("GET", "/supplier/{id}", "revamp", "suppliers", "Get supplier by ID"),
  ep("POST", "/supplier", "revamp", "suppliers", "Create supplier", { hasBody: true }),
  ep("PUT", "/supplier/{id}", "revamp", "suppliers", "Update supplier", { hasBody: true }),
  ep("PATCH", "/supplier/{id}", "revamp", "suppliers", "Patch supplier", { hasBody: true }),
  ep("DELETE", "/supplier/{id}", "revamp", "suppliers", "Delete supplier", { hasBody: true }),
  ep("GET", "/supplier/counts", "revamp", "suppliers", "Get supplier counts"),
  ep("GET", "/supplier/search", "revamp", "suppliers", "Search suppliers", {
    queryParams: ["name", "fullAddress"],
  }),
  ep("GET", "/supplier/contact", "revamp", "suppliers", "Search contacts", {
    queryParams: ["name"],
  }),
  ep("POST", "/supplier/{id}/address", "revamp", "suppliers", "Add address", { hasBody: true }),
  ep("POST", "/supplier/{id}/contact", "revamp", "suppliers", "Add contact", { hasBody: true }),
  ep("GET", "/supplier/{id}/activities", "revamp", "suppliers", "Get activities"),

  // ─── SUBCONTRACTORS (revamp) ──────────────────────────────────────────────
  ep("GET", "/sub-contractor", "revamp", "subcontractors", "List subcontractors", {
    queryParams: ["page", "limit", "searchText", "sortBy", "sortOrder", "searchBy"],
  }),
  ep("GET", "/sub-contractor/{id}", "revamp", "subcontractors", "Get subcontractor by ID"),
  ep("POST", "/sub-contractor", "revamp", "subcontractors", "Create subcontractor", { hasBody: true }),
  ep("PUT", "/sub-contractor/{id}", "revamp", "subcontractors", "Update subcontractor", { hasBody: true }),
  ep("PATCH", "/sub-contractor/{id}", "revamp", "subcontractors", "Patch subcontractor", { hasBody: true }),
  ep("DELETE", "/sub-contractor/{id}", "revamp", "subcontractors", "Delete subcontractor", { hasBody: true }),
  ep("GET", "/sub-contractor/counts", "revamp", "subcontractors", "Get counts"),
  ep("GET", "/sub-contractor/search", "revamp", "subcontractors", "Search subcontractors", {
    queryParams: ["name", "fullAddress"],
  }),
  ep("GET", "/sub-contractor/contact", "revamp", "subcontractors", "Search contacts", {
    queryParams: ["name"],
  }),
  ep("POST", "/sub-contractor/{id}/address", "revamp", "subcontractors", "Add address", { hasBody: true }),
  ep("POST", "/sub-contractor/{id}/contact", "revamp", "subcontractors", "Add contact", { hasBody: true }),
  ep("GET", "/sub-contractor/{id}/financial-summary", "revamp", "subcontractors", "Get financial summary"),
  ep("GET", "/sub-contractor/{id}/workorder-estimate", "revamp", "subcontractors", "Get estimates", {
    queryParams: ["page", "limit", "search", "orderByKey", "orderByValue"],
  }),
  ep("GET", "/sub-contractor/{id}/workorder-invoice", "revamp", "subcontractors", "Get invoices", {
    queryParams: ["page", "limit", "search", "orderByKey", "orderByValue"],
  }),
  ep("GET", "/sub-contractor/{id}/activities", "revamp", "subcontractors", "Get activities"),

  // ─── LEADS (revamp) ───────────────────────────────────────────────────────
  ep("GET", "/leads", "revamp", "leads", "List leads", {
    queryParams: ["page", "limit", "searchBy", "search", "zones", "source", "status", "name", "address", "serviceName", "startDateTime", "endDateTime", "receivedOn", "orderByKey", "orderByValue"],
  }),
  ep("GET", "/leads/{leadId}", "revamp", "leads", "Get lead by ID"),
  ep("POST", "/leads", "revamp", "leads", "Create lead", { hasBody: true }),
  ep("PUT", "/leads/{leadId}", "revamp", "leads", "Update lead", { hasBody: true }),
  ep("PATCH", "/leads/{leadId}", "revamp", "leads", "Patch lead status", { hasBody: true }),
  ep("DELETE", "/leads/{leadId}", "revamp", "leads", "Delete lead"),
  ep("GET", "/leads/summary", "revamp", "leads", "Lead summary"),
  ep("GET", "/leads/filter-list", "revamp", "leads", "Filter leads list", {
    queryParams: ["searchBy", "search"],
  }),
  ep("POST", "/leads/notes", "revamp", "leads", "Add lead note", { hasBody: true }),
  ep("GET", "/leads/{leadId}/notes", "revamp", "leads", "Get lead notes", {
    queryParams: ["createdBy", "createdOn", "page", "limit"],
  }),
  ep("PUT", "/leads/notes/{noteId}", "revamp", "leads", "Update lead note", { hasBody: true }),
  ep("DELETE", "/leads/notes/{noteId}", "revamp", "leads", "Delete lead note"),

  // ─── PRICEBOOK (revamp) ───────────────────────────────────────────────────
  ep("GET", "/pricebook", "revamp", "pricebook", "List pricebook items", {
    queryParams: ["page", "limit"],
  }),
  ep("POST", "/pricebook", "revamp", "pricebook", "Create pricebook item", { hasBody: true }),
  ep("PUT", "/pricebook/{id}", "revamp", "pricebook", "Update pricebook item", { hasBody: true }),
  ep("DELETE", "/pricebook/{id}", "revamp", "pricebook", "Delete pricebook item"),
  ep("GET", "/pricebook/defaultCostMarkup", "revamp", "pricebook", "Get default cost markup"),
  ep("PUT", "/pricebook/defaultCostMarkup", "revamp", "pricebook", "Update default cost markup", { hasBody: true }),

  // ─── NOTES (revamp) ───────────────────────────────────────────────────────
  ep("POST", "/notes", "revamp", "notes", "Create note", { hasBody: true }),
  ep("GET", "/notes", "revamp", "notes", "List notes", {
    queryParams: ["page", "limit", "noteType", "customerId", "supplierId", "subcontractorId", "createdBy", "createdOn"],
  }),
  ep("PATCH", "/notes/{noteId}", "revamp", "notes", "Update note", { hasBody: true }),
  ep("DELETE", "/notes/{noteId}", "revamp", "notes", "Delete note"),

  // ─── JOBS V2 (revamp) ─────────────────────────────────────────────────────
  ep("GET", "/jobs", "revamp", "jobsV2", "List jobs", {
    queryParams: ["zoneIds", "tagIds", "orderByKey", "orderByValue", "jobNumber", "status", "customerId", "createdBy", "jobLeadId", "startDateTime", "endDateTime", "jobName"],
  }),
  ep("GET", "/jobs/{jobId}", "revamp", "jobsV2", "Get job by ID"),
  ep("POST", "/jobs", "revamp", "jobsV2", "Create job", { hasBody: true }),
  ep("PUT", "/jobs/{jobId}", "revamp", "jobsV2", "Update job", { hasBody: true }),
  ep("PATCH", "/jobs/{jobId}/status", "revamp", "jobsV2", "Update job status", { hasBody: true }),
  ep("GET", "/jobs/cards-list", "revamp", "jobsV2", "Get jobs card list"),
  ep("GET", "/jobs/summary", "revamp", "jobsV2", "Job summary"),
  ep("GET", "/jobs/{jobId}/activities", "revamp", "jobsV2", "Get job activities"),

  // ─── TASKS V2 (revamp) ────────────────────────────────────────────────────
  ep("GET", "/tasks", "revamp", "tasksV2", "List tasks", {
    queryParams: ["taskStatus", "assignedTo", "subcontractorId", "technicianId", "createdBy", "customerId", "taskId", "jobId"],
  }),
  ep("GET", "/tasks/{taskId}", "revamp", "tasksV2", "Get task by ID"),
  ep("POST", "/tasks", "revamp", "tasksV2", "Create task", { hasBody: true }),
  ep("PUT", "/tasks/{taskId}", "revamp", "tasksV2", "Update task", { hasBody: true }),
  ep("PATCH", "/tasks/{taskId}", "revamp", "tasksV2", "Patch task", { hasBody: true }),
  ep("GET", "/tasks/scheduler", "revamp", "tasksV2", "Get scheduler tasks", {
    queryParams: ["startDateTime", "endDateTime", "status", "search", "zones", "tags", "assign_to"],
  }),
  ep("GET", "/tasks/assistants", "revamp", "tasksV2", "Get task assistants", {
    queryParams: ["assignedTechnicianId", "limit"],
  }),
  ep("GET", "/tasks/{taskId}/activities", "revamp", "tasksV2", "Get task activities"),
  ep("GET", "/tasks/unassigned-tasks", "revamp", "tasksV2", "Get unassigned tasks", {
    queryParams: ["page", "limit"],
  }),
  ep("GET", "/tasks/unscheduled-tasks", "revamp", "tasksV2", "Get unscheduled tasks", {
    queryParams: ["page", "limit"],
  }),
  ep("GET", "/tasks/team", "revamp", "tasksV2", "Get team", {
    queryParams: ["page", "limit", "type", "search", "searchBy", "technicianZoneIds", "technicianTagIds"],
  }),
  ep("POST", "/tasks/clock-in", "revamp", "tasksV2", "Clock in", { hasBody: true }),
  ep("POST", "/tasks/clock-out", "revamp", "tasksV2", "Clock out", { hasBody: true }),
  ep("POST", "/tasks/close", "revamp", "tasksV2", "Close task", { hasBody: true }),
  ep("POST", "/tasks/force-clock-out", "revamp", "tasksV2", "Force clock out", { hasBody: true }),
  ep("POST", "/tasks/schedule", "revamp", "tasksV2", "Schedule task", { hasBody: true }),
  ep("PUT", "/tasks/schedule/{scheduleId}", "revamp", "tasksV2", "Update schedule", { hasBody: true }),
];

// ─── Public API ────────────────────────────────────────────────────────────────

/** Return all hardcoded endpoints (full CRUD + actions per entity). */
export function endpointsFromHardcoded(): Endpoint[] {
  return allHardcodedEndpoints;
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
  if (endpoint.source === "hardcoded" && ["POST", "PUT", "PATCH"].includes(endpoint.method)) {
    // Strip all path params to get the base path, then match against entities
    const basePath = endpoint.path.replace(/\/\{[^}]+\}/g, "").replace(/\/+$/, "");
    const entity = entities.find((e) => e.endpoint.replace(/\/+$/, "") === basePath);
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
