import { Schema } from "effect";
import { ConfigFileSchema } from "./configFile";

export interface SchemaAnnotation {
  readonly title?: string | undefined;
  readonly description?: string | undefined;
}

const isNode = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const record = (
  out: Map<string, SchemaAnnotation>,
  path: readonly string[],
  node: Record<string, unknown>,
) => {
  const key = path.join(".");
  const existing = out.get(key);
  const title =
    existing?.title ??
    (typeof node.title === "string" ? node.title : undefined);
  const description =
    existing?.description ??
    (typeof node.description === "string" ? node.description : undefined);
  out.set(key, { title, description });
};

const collect = (
  node: unknown,
  prefix: readonly string[],
  out: Map<string, SchemaAnnotation>,
) => {
  if (!isNode(node)) {
    return;
  }

  if (isNode(node.properties)) {
    Object.entries(node.properties).forEach(([key, child]) => {
      if (!isNode(child)) {
        return;
      }
      const path = [...prefix, key];
      record(out, path, child);
      collect(child, path, out);
    });
  }

  if (Array.isArray(node.anyOf)) {
    node.anyOf.forEach((branch) => collect(branch, prefix, out));
  }
};

const build = () => {
  const document = Schema.toJsonSchemaDocument(Schema.toType(ConfigFileSchema));
  const out = new Map<string, SchemaAnnotation>();
  collect(document.schema, [], out);
  return out;
};

export const configSchemaAnnotations: ReadonlyMap<string, SchemaAnnotation> =
  build();

export const schemaAnnotationForPath = (
  path: readonly string[],
): SchemaAnnotation | undefined => configSchemaAnnotations.get(path.join("."));
