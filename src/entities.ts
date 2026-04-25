import { faker } from "@faker-js/faker";

// ─── Types ──────────────────────────────────────────────────────────────────────

export type SeedContext = {
  /** Pick a random ID from a previously-seeded entity */
  pickId: (entity: string) => string;
  /**
   * Pick a sub-resource ID that belongs to a specific parent.
   * e.g. ctx.pickRelated("customers", "addresses") → an addressId from a customer
   *
   * The seed runner MUST parse creation responses and store nested IDs keyed by
   * (parentEntity, subResource). For example, POST /customer returns addresses[]
   * with `id` fields — store those under ("customers", "addresses").
   * If the API doesn't return sub-resource IDs in the creation response, the
   * runner should make a follow-up GET to retrieve them.
   */
  pickRelated: (parentEntity: string, subResource: string) => string;
  /** Get all stored IDs for an entity */
  getIds: (entity: string) => string[];
};

export type Entity = {
  name: string;
  /**
   * Full path including version prefix.
   *   V1 endpoints:     /api/v1/...  → appended to NEXT_PUBLIC_BACKEND_URL
   *   Revamp endpoints: /...         → appended to NEXT_PUBLIC_BACKEND_REVAMP_URL (no version prefix)
   */
  endpoint: string;
  /**
   * Which backend host to target:
   *   "v1"     → NEXT_PUBLIC_BACKEND_URL   (e.g. https://dev.swivlconnect.com)
   *   "revamp" → NEXT_PUBLIC_BACKEND_REVAMP_URL (e.g. https://dev.revamp.swivlconnect.com)
   */
  backend: "v1" | "revamp";
  defaultCount: number;
  dependsOn?: string[];
  payload: (ctx: SeedContext) => Record<string, unknown>;
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

const usPhone = () =>
  `+1${faker.string.numeric(3)}${faker.string.numeric(3)}${faker.string.numeric(4)}`;

const fakeAddress = () => ({
  addressLine1: faker.location.streetAddress(),
  addressLine2: faker.location.secondaryAddress(),
  city: faker.location.city(),
  state: faker.location.state({ abbreviated: true }),
  zipCode: faker.location.zipCode("#####"),
  country: "US",
  latitude: faker.location.latitude(),
  longitude: faker.location.longitude(),
  fullAddress: faker.location.streetAddress({ useFullAddress: true }),
  isPrimary: true,
  isBilling: true,
  buildingUnits: [],
  notes: "",
});

const fakeContact = (overrides: { isPrimary?: boolean; isBilling?: boolean } = {}) => ({
  name: faker.person.fullName(),
  title: faker.person.jobTitle(),
  isPrimary: overrides.isPrimary ?? true,
  isBilling: overrides.isBilling ?? true, // API requires exactly one billing contact
  officePhoneNumber: [
    {
      officePhoneNumber: faker.string.numeric(10),
      officePhoneExtension: faker.string.numeric(3),
    },
  ],
  mobileNumber: [{ mobileNumber: usPhone() }],
  email: [{ email: faker.internet.email() }],
});

// ─── Tier 0 — no dependencies ──────────────────────────────────────────────────

const tags: Entity = {
  name: "tags",
  endpoint: "/api/v1/tags",
  backend: "v1",
  defaultCount: 10,
  payload: () => ({
    name: faker.commerce.department() + " " + faker.string.alphanumeric(4),
    type: faker.helpers.arrayElement(["ACCOUNT", "SERVICE"]),
  }),
};

const zones: Entity = {
  name: "zones",
  endpoint: "/api/v1/zones",
  backend: "v1",
  defaultCount: 5,
  payload: () => {
    const lat = faker.location.latitude();
    const lng = faker.location.longitude();
    return {
      name: `${faker.location.city()} Service Area`,
      type: "CIRCLE",
      coordinates: { lat, lng, radius: faker.number.int({ min: 5000, max: 50000 }) },
    };
  },
};

const pricebook: Entity = {
  name: "pricebook",
  endpoint: "/pricebook",
  backend: "revamp",
  defaultCount: 15,
  payload: () => {
    const isTaxable = faker.datatype.boolean();
    const baseRate = faker.number.float({ min: 25, max: 500, fractionDigits: 2 });
    return {
      name: faker.commerce.productName(),
      tier1: baseRate,
      tier2: +(baseRate * 1.15).toFixed(2),
      tier3: +(baseRate * 1.3).toFixed(2),
      selectedTier: faker.helpers.arrayElement(["tier1", "tier2", "tier3"]),
      isTaxable,
      ...(isTaxable ? { taxPercent: faker.helpers.arrayElement([5, 7, 8.25, 10, 13]) } : {}),
      invoiceDescription: faker.commerce.productDescription(),
      estimateDescription: faker.commerce.productDescription(),
    };
  },
};

const vehicles: Entity = {
  name: "vehicles",
  endpoint: "/api/v1/vehicles",
  backend: "v1",
  defaultCount: 5,
  payload: () => ({
    name: `${faker.vehicle.manufacturer()} ${faker.vehicle.model()}`,
    vin: faker.vehicle.vin(),
    currentMileage: faker.number.int({ min: 0, max: 150000 }),
    estimatedMileagePerYear: faker.number.int({ min: 5000, max: 30000 }),
    expectedLifetimeMileage: faker.number.int({ min: 150000, max: 300000 }),
    costPerMile: faker.number.float({ min: 0.2, max: 1.5, fractionDigits: 2 }),
    region: faker.location.state({ abbreviated: true }),
    modelYear: String(faker.number.int({ min: 2015, max: 2026 })),
    registrationNumber: faker.vehicle.vrm(),
  }),
};

const equipment: Entity = {
  name: "equipment",
  endpoint: "/api/v1/equipment",
  backend: "v1",
  defaultCount: 8,
  payload: () => ({
    equipmentName: faker.commerce.productName(),
    manufacturer: faker.company.name(),
    purchasePrice: faker.number.float({ min: 100, max: 10000, fractionDigits: 2 }),
    costPerHour: faker.number.float({ min: 5, max: 150, fractionDigits: 2 }),
    serialNumber: faker.string.alphanumeric(12).toUpperCase(),
    purchaseDate: faker.date.past({ years: 3 }).toISOString(),
    notes: faker.lorem.sentence(),
  }),
};

const userRoles: Entity = {
  name: "userRoles",
  endpoint: "/api/v1/permission/role",
  backend: "v1",
  defaultCount: 3,
  payload: () => ({
    name:
      faker.helpers.arrayElement([
        "Field Technician",
        "Office Manager",
        "Dispatcher",
        "Estimator",
        "Sales Rep",
      ]) +
      " " +
      faker.string.alphanumeric(3),
    description: faker.lorem.sentence(),
    resources: [],
  }),
};

// ─── Tier 1 — depend on tags (optional) ─────────────────────────────────────

const customers: Entity = {
  name: "customers",
  endpoint: "/customer",
  backend: "revamp",
  defaultCount: 20,
  dependsOn: ["tags"],
  payload: (ctx) => ({
    name: faker.company.name(),
    addresses: [fakeAddress()],
    contacts: [fakeContact()],
    tagIds: [ctx.pickId("tags")],
    websiteUrl: faker.internet.url(),
    salesManagerIds: [],
    accountManagerIds: [],
  }),
};

const suppliers: Entity = {
  name: "suppliers",
  endpoint: "/supplier",
  backend: "revamp",
  defaultCount: 8,
  dependsOn: ["tags"],
  payload: (ctx) => ({
    name: faker.company.name(),
    addresses: [fakeAddress()],
    contacts: [fakeContact()],
    tagIds: [ctx.pickId("tags")],
    websiteUrl: faker.internet.url(),
    salesManagerIds: [],
    accountManagerIds: [],
  }),
};

const subcontractors: Entity = {
  name: "subcontractors",
  endpoint: "/sub-contractor",
  backend: "revamp",
  defaultCount: 6,
  dependsOn: ["tags"],
  payload: (ctx) => ({
    name: faker.company.name(),
    addresses: [fakeAddress()],
    contacts: [fakeContact()],
    tagIds: [ctx.pickId("tags")],
    websiteUrl: faker.internet.url(),
    salesManagerIds: [],
    accountManagerIds: [],
  }),
};

const leads: Entity = {
  name: "leads",
  endpoint: "/leads",
  backend: "revamp",
  defaultCount: 15,
  payload: () => ({
    name: faker.company.name() + " Lead",
    address: {
      fullAddress: faker.location.streetAddress({ useFullAddress: true }),
      addressLine1: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      country: "US",
      zipcode: faker.location.zipCode("#####"),
      latitude: String(faker.location.latitude()),
      longitude: String(faker.location.longitude()),
    },
    contactName: faker.person.fullName(),
    phoneNumber: usPhone(),
    email: faker.internet.email(),
    serviceName: faker.commerce.productName(),
    description: faker.lorem.paragraph(),
    receivedOn: faker.date.recent({ days: 30 }).toISOString(),
    status: "RECEIVED",
  }),
};

// ─── Tier 2 — depend on customers ──────────────────────────────────────────

const jobs: Entity = {
  name: "jobs",
  endpoint: "/api/v1/jobs",
  backend: "v1",
  defaultCount: 20,
  dependsOn: ["customers"],
  payload: (ctx) => ({
    customerId: ctx.pickId("customers"),
    siteAddressId: ctx.pickRelated("customers", "addresses"),
    name: faker.lorem.words({ min: 2, max: 5 }).slice(0, 50),
    description: faker.lorem.paragraph().slice(0, 1000),
    tags: [],
  }),
};

const crmAccounts: Entity = {
  name: "crmAccounts",
  endpoint: "/api/v1/crm/account",
  backend: "v1",
  defaultCount: 10,
  dependsOn: ["tags"],
  payload: (ctx) => {
    const accountType = faker.helpers.arrayElement(["customer", "supplier", "vendor"]);
    return {
      name: faker.company.name(),
      accountType,
      phoneNumber: usPhone(),
      email: faker.internet.email(),
      status: "active",
      primaryAddressData: {
        fullAddress: faker.location.streetAddress({ useFullAddress: true }),
        line1: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state({ abbreviated: true }),
        country: "US",
        zipCode: faker.location.zipCode("#####"),
        longitude: String(faker.location.longitude()),
        latitude: String(faker.location.latitude()),
      },
      mainContactDetails: {
        name: faker.person.fullName(),
        title: faker.person.jobTitle(),
        email: faker.internet.email(),
        primaryMobile: usPhone(),
      },
      accountTag: [ctx.pickId("tags")],
      accountManagerData: [],
    };
  },
};

// ─── Tier 3 — depend on jobs / crmAccounts ──────────────────────────────────

const crmContacts: Entity = {
  name: "crmContacts",
  endpoint: "/api/v1/crm/contact",
  backend: "v1",
  defaultCount: 15,
  dependsOn: ["crmAccounts"],
  payload: (ctx) => ({
    accountId: ctx.pickId("crmAccounts"),
    name: faker.person.fullName(),
    title: faker.person.jobTitle(),
    email: faker.internet.email(),
    primaryMobile: usPhone(),
  }),
};

const tasks: Entity = {
  name: "tasks",
  endpoint: "/api/v1/task",
  backend: "v1",
  defaultCount: 30,
  dependsOn: ["jobs", "customers"],
  payload: (ctx) => ({
    jobId: ctx.pickId("jobs"),
    accountId: ctx.pickId("customers"),
    siteAddressId: ctx.pickRelated("customers", "addresses"),
    name: faker.lorem.words({ min: 2, max: 4 }).slice(0, 50),
    description: faker.lorem.sentence().slice(0, 1000),
  }),
};

const estimates: Entity = {
  name: "estimates",
  endpoint: "/api/v1/estimate",
  backend: "v1",
  defaultCount: 10,
  dependsOn: ["jobs", "customers"],
  payload: (ctx) => ({
    mode: "Draft",
    jobInfo: {
      type: "Existing",
      accountId: ctx.pickId("customers"),
      jobId: ctx.pickId("jobs"),
    },
    estimateInfo: {
      totalAmount: faker.number.float({ min: 500, max: 25000, fractionDigits: 2 }),
    },
  }),
};

const invoices: Entity = {
  name: "invoices",
  endpoint: "/api/v1/invoice",
  backend: "v1",
  defaultCount: 10,
  dependsOn: ["jobs", "customers"],
  payload: (ctx) => ({
    mode: "Draft",
    jobInfo: {
      type: "Existing",
      accountId: ctx.pickId("customers"),
      jobId: ctx.pickId("jobs"),
    },
    invoiceInfo: {
      totalAmount: faker.number.float({ min: 500, max: 25000, fractionDigits: 2 }),
    },
  }),
};

const notes: Entity = {
  name: "notes",
  endpoint: "/notes",
  backend: "revamp",
  defaultCount: 20,
  dependsOn: ["jobs", "customers"],
  payload: (ctx) => {
    const noteType = faker.helpers.arrayElement(["Job", "Customer"]);
    return {
      note: faker.lorem.paragraph().slice(0, 255),
      noteType,
      ...(noteType === "Job"
        ? { jobId: ctx.pickId("jobs") }
        : { customerId: ctx.pickId("customers") }),
    };
  },
};

// ─── Entity registry (topologically sorted) ─────────────────────────────────

export const entities: Entity[] = [
  // Tier 0 — no dependencies
  tags,
  zones,
  pricebook,
  vehicles,
  equipment,
  userRoles,
  // Tier 1 — depends on tags
  customers,
  suppliers,
  subcontractors,
  leads,
  // Tier 2 — depends on customers / tags
  jobs,
  crmAccounts,
  // Tier 3 — depends on jobs / crmAccounts
  crmContacts,
  tasks,
  estimates,
  invoices,
  notes,
];
