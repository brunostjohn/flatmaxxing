import { JsonSchema, Schema } from "effect";
import { ConfigFileSchema } from "./configFile";
import { defaultConfigFile } from "./defaults";

type Node = Record<string, unknown>;

const nonFiniteTokens = new Set(["NaN", "Infinity", "-Infinity"]);

const isNode = (value: unknown): value is Node =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isPlainNumberMember = (member: unknown) =>
  isNode(member) && member.type === "number" && !("enum" in member);

const isNonFiniteMember = (member: unknown) =>
  isNode(member) &&
  member.type === "string" &&
  Array.isArray(member.enum) &&
  member.enum.length === 1 &&
  nonFiniteTokens.has(String(member.enum[0]));

const isNonFiniteNumberUnion = (node: Node) => {
  const { anyOf } = node;
  return (
    Array.isArray(anyOf) &&
    anyOf.some(isPlainNumberMember) &&
    anyOf.every(
      (member) => isPlainNumberMember(member) || isNonFiniteMember(member),
    )
  );
};

const cleanNode = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(cleanNode);
  }

  if (!isNode(value)) {
    return value;
  }

  if (isNonFiniteNumberUnion(value)) {
    const { anyOf: _anyOf, required: _required, ...rest } = value;
    return { ...rest, type: "number" };
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "required")
      .map(([key, child]) => [key, cleanNode(child)]),
  );
};

const injectDefaults = (node: unknown, value: unknown) => {
  if (!isNode(node) || !isNode(node.properties) || !isNode(value)) {
    return;
  }

  Object.entries(node.properties).forEach(([key, child]) => {
    if (!isNode(child)) {
      return;
    }

    const childValue = value[key];

    if (childValue === undefined) {
      return;
    }

    if (isNode(child.properties) && isNode(childValue)) {
      injectDefaults(child, childValue);
    } else {
      child.default = childValue;
    }
  });
};

export const buildConfigJsonSchema = () => {
  const document = Schema.toJsonSchemaDocument(
    Schema.toType(ConfigFileSchema),
    { additionalProperties: false },
  );

  const schema = cleanNode(document.schema) as Node;
  injectDefaults(schema, defaultConfigFile);

  const definitions = Object.fromEntries(
    Object.entries(document.definitions).map(([key, value]) => [
      key,
      cleanNode(value),
    ]),
  );

  const draft07 = JsonSchema.toDocumentDraft07({
    dialect: "draft-2020-12",
    schema: schema as JsonSchema.JsonSchema,
    definitions: definitions as JsonSchema.Definitions,
  });

  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    $id: "https://flatmaxx.dev/flatmaxxing.schema.json",
    ...draft07.schema,
    ...(Object.keys(draft07.definitions).length > 0
      ? { definitions: draft07.definitions }
      : {}),
  };
};

export const buildConfigJsonSchemaText = () =>
  `${JSON.stringify(buildConfigJsonSchema(), null, 2)}\n`;
