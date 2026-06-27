export type TomlPrimitive = string | number | boolean;
export type TomlValue =
  | TomlPrimitive
  | readonly TomlValue[]
  | { readonly [key: string]: TomlValue | undefined };

export const escapeTomlString = (value: string): string =>
  `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;

const isTomlArray = (value: TomlValue): value is readonly TomlValue[] =>
  Array.isArray(value);

const renderInlineObject = (
  value: { readonly [key: string]: TomlValue | undefined },
  renderValue: (value: TomlValue) => string,
): string =>
  `{ ${Object.entries(value)
    .filter(([, entry]) => entry !== undefined)
    .map(([key, entry]) => `${key} = ${renderValue(entry!)}`)
    .join(", ")} }`;

export const renderTomlInlineValue = (value: TomlValue): string => {
  if (typeof value === "string") {
    return escapeTomlString(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (isTomlArray(value)) {
    return `[${value.map(renderTomlInlineValue).join(", ")}]`;
  }

  return renderInlineObject(value, renderTomlInlineValue);
};

const renderTomlArray = (value: readonly TomlValue[]): string => {
  if (value.length === 0) {
    return "[]";
  }

  if (value.every((entry) => typeof entry === "object")) {
    return `[\n${value.map((entry) => `  ${renderTomlInlineValue(entry)},`).join("\n")}\n]`;
  }

  return `[${value.map(renderTomlInlineValue).join(", ")}]`;
};

export const renderTomlValue = (value: TomlValue): string => {
  if (typeof value === "string") {
    return escapeTomlString(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (isTomlArray(value)) {
    return renderTomlArray(value);
  }

  return renderInlineObject(value, renderTomlValue);
};

export const renderTomlAssignments = (
  entries: readonly (readonly [string, TomlValue | undefined])[],
): string =>
  entries
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key} = ${renderTomlValue(value!)}`)
    .join("\n");

export const renderTomlSection = (
  name: string,
  entries: readonly (readonly [string, TomlValue | undefined])[],
): string => `[${name}]\n${renderTomlAssignments(entries)}`;
