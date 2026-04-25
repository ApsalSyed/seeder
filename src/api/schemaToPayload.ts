import { faker } from "@faker-js/faker";

const FORMATS: Record<string, () => string> = {
  email: () => faker.internet.email(),
  uri: () => faker.internet.url(),
  url: () => faker.internet.url(),
  uuid: () => faker.string.uuid(),
  hostname: () => faker.internet.domainName(),
  ipv4: () => faker.internet.ipv4(),
  ipv6: () => faker.internet.ipv6(),
  "date-time": () => new Date().toISOString(),
  date: () => new Date().toISOString().slice(0, 10),
  time: () => new Date().toISOString().slice(11, 19),
  password: () => faker.internet.password(),
  phone: () => faker.phone.number(),
  byte: () => "aGVsbG8=",
};

/** Generate a string sample given JSON Schema constraints. */
function generateString(schema: any, propName?: string): string {
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return faker.helpers.arrayElement(schema.enum);
  }
  if (schema.example != null) return String(schema.example);
  if (schema.default != null) return String(schema.default);

  if (schema.format && FORMATS[schema.format]) return FORMATS[schema.format]();

  // Heuristic by property name — more realistic than lorem.word()
  const n = (propName ?? "").toLowerCase();
  if (n.endsWith("id")) return faker.string.uuid();
  if (n.includes("email")) return faker.internet.email();
  if (n.includes("phone") || n.includes("mobile")) return faker.phone.number();
  if (n.includes("url") || n.includes("website")) return faker.internet.url();
  if (n.includes("name") && n.includes("first")) return faker.person.firstName();
  if (n.includes("name") && n.includes("last")) return faker.person.lastName();
  if (n.includes("fullname") || n === "name") return faker.person.fullName();
  if (n.includes("company")) return faker.company.name();
  if (n.includes("city")) return faker.location.city();
  if (n.includes("state")) return faker.location.state({ abbreviated: true });
  if (n.includes("zip") || n.includes("postal")) return faker.location.zipCode();
  if (n.includes("country")) return "US";
  if (n.includes("address")) return faker.location.streetAddress();
  if (n.includes("description") || n.includes("note")) return faker.lorem.sentence();
  if (n.includes("title")) return faker.person.jobTitle();

  // Length constraints
  const min = schema.minLength ?? 4;
  const max = schema.maxLength ?? Math.max(min, 12);
  let value = faker.lorem.words(2);
  if (value.length < min) value = value.padEnd(min, "x");
  if (value.length > max) value = value.slice(0, max);
  return value;
}

function generateNumber(schema: any, isInt: boolean): number {
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return faker.helpers.arrayElement(schema.enum);
  }
  if (schema.example != null) return Number(schema.example);
  if (schema.default != null) return Number(schema.default);
  const min = schema.minimum ?? 1;
  const max = schema.maximum ?? Math.max(min + 100, 1000);
  return isInt
    ? faker.number.int({ min, max })
    : faker.number.float({ min, max, fractionDigits: 2 });
}

/**
 * Generate a sample value from a JSON Schema. Handles type, enum, format,
 * properties, required, items, oneOf/anyOf, and a few naming heuristics.
 */
export function generateFromSchema(schema: any, propName?: string, depth = 0): unknown {
  if (!schema || depth > 8) return null;

  // oneOf / anyOf — pick the first option
  const variant = schema.oneOf?.[0] ?? schema.anyOf?.[0];
  if (variant) return generateFromSchema(variant, propName, depth + 1);

  // allOf — merge
  if (Array.isArray(schema.allOf)) {
    const merged = schema.allOf.reduce(
      (acc: any, s: any) => ({
        ...acc,
        ...s,
        properties: { ...(acc.properties ?? {}), ...(s.properties ?? {}) },
        required: [...(acc.required ?? []), ...(s.required ?? [])],
      }),
      {},
    );
    return generateFromSchema(merged, propName, depth + 1);
  }

  // Inferred type if missing
  let type = schema.type;
  if (!type) {
    if (schema.properties) type = "object";
    else if (schema.items) type = "array";
    else if (schema.enum) type = typeof schema.enum[0];
    else type = "string";
  }

  switch (type) {
    case "string":
      return generateString(schema, propName);
    case "integer":
      return generateNumber(schema, true);
    case "number":
      return generateNumber(schema, false);
    case "boolean":
      if (schema.example != null) return !!schema.example;
      return faker.datatype.boolean();
    case "array": {
      const itemSchema = schema.items ?? { type: "string" };
      const len = Math.max(1, Math.min(2, schema.minItems ?? 1));
      return Array.from({ length: len }, (_, i) =>
        generateFromSchema(itemSchema, `${propName ?? "item"}_${i}`, depth + 1),
      );
    }
    case "object": {
      const out: Record<string, unknown> = {};
      const props = schema.properties ?? {};
      const required: string[] = schema.required ?? [];
      // Always include required props; include optional props too for fuller payloads
      const all = new Set([...required, ...Object.keys(props)]);
      for (const key of all) {
        out[key] = generateFromSchema(props[key], key, depth + 1);
      }
      return out;
    }
    default:
      return null;
  }
}
