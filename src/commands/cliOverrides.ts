import { isRecord, type TomlValue } from "@/config";
import {
  configEditorFields,
  type ConfigEditorFieldKind,
} from "./configEditorModel";
import { parse } from "toml";

export type CliOverrideValue =
  | {
      readonly type: "set";
      readonly path: string;
      readonly value: unknown;
      readonly source: string;
    }
  | {
      readonly type: "unset";
      readonly path: string;
      readonly source: string;
    };

type CliSetOverrideValue = Extract<CliOverrideValue, { readonly type: "set" }>;
type CliUnsetOverrideValue = Extract<
  CliOverrideValue,
  { readonly type: "unset" }
>;

export type CliAliasOverride = {
  readonly path: string;
  readonly value: unknown;
  readonly source: string;
};

export type BuildCliOverridesOptions = {
  readonly set?: readonly string[] | undefined;
  readonly unset?: readonly string[] | undefined;
  readonly aliases?: readonly CliAliasOverride[] | undefined;
};

type ConfigFieldMetadata = {
  readonly path: readonly string[];
  readonly kind: ConfigEditorFieldKind;
};

const pathKey = (path: readonly string[]) => path.join(".");

const fieldsByPath = new Map<string, ConfigFieldMetadata>(
  configEditorFields.map((field) => [
    pathKey(field.path),
    { path: field.path, kind: field.kind },
  ]),
);

const optionalFieldKinds = new Set<ConfigEditorFieldKind>([
  "optionalFloat",
  "optionalString",
  "select",
]);

const parseTomlAssignmentValue = (value: string, source: string): unknown => {
  const parsed = (() => {
    try {
      return parse(`value = ${value}`) as unknown;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      throw new Error(`${source} has invalid TOML literal: ${message}`);
    }
  })();

  if (!isRecord(parsed)) {
    throw new Error(`${source} must parse to a TOML value.`);
  }

  return parsed.value;
};

const asTomlValue = (value: unknown, source: string): TomlValue => {
  if (
    typeof value === "string" ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => asTomlValue(entry, source));
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        entry === undefined ? undefined : asTomlValue(entry, source),
      ]),
    );
  }

  throw new Error(
    `${source} must be a TOML string, number, boolean, array, or inline table.`,
  );
};

const validatePath = (path: string, source: string): ConfigFieldMetadata => {
  const field = fieldsByPath.get(path);

  if (!field) {
    throw new Error(
      `${source} references unknown config path "${path}". Use one of: ${[
        ...fieldsByPath.keys(),
      ].join(", ")}.`,
    );
  }

  if (path === "extends") {
    throw new Error(`${source} cannot override extends from the command line.`);
  }

  return field;
};

const validateSetValue = (value: unknown, source: string) => {
  asTomlValue(value, source);
};

export const parseCliSetOverride = (
  text: string,
  source = "--set",
): CliSetOverrideValue => {
  const equalsIndex = text.indexOf("=");

  if (equalsIndex <= 0) {
    throw new Error(`${source} must use path=value syntax.`);
  }

  const path = text.slice(0, equalsIndex).trim();
  const valueText = text.slice(equalsIndex + 1).trim();

  if (path === "" || valueText === "") {
    throw new Error(`${source} must include both a path and a value.`);
  }

  validatePath(path, source);
  const value = parseTomlAssignmentValue(valueText, source);
  validateSetValue(value, source);

  return {
    type: "set",
    path,
    value,
    source,
  };
};

export const parseCliUnsetOverride = (
  path: string,
  source = "--unset",
): CliUnsetOverrideValue => {
  const trimmedPath = path.trim();
  const field = validatePath(trimmedPath, source);

  if (!optionalFieldKinds.has(field.kind)) {
    throw new Error(`${source} can only clear optional config paths.`);
  }

  return {
    type: "unset",
    path: trimmedPath,
    source,
  };
};

const setPath = (
  target: Record<string, unknown>,
  path: readonly string[],
  value: unknown,
) => {
  let current = target;

  for (const part of path.slice(0, -1)) {
    const next = current[part];
    if (!isRecord(next)) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[path[path.length - 1]!] = value;
};

const assertUniquePath = (
  seen: Map<string, string>,
  path: string,
  source: string,
) => {
  const previous = seen.get(path);

  if (previous !== undefined) {
    throw new Error(
      `Config path "${path}" was overridden more than once (${previous}, ${source}).`,
    );
  }

  seen.set(path, source);
};

export const buildCliOverrides = ({
  set = [],
  unset = [],
  aliases = [],
}: BuildCliOverridesOptions): Record<string, unknown> => {
  const overrides: Record<string, unknown> = {};
  const seen = new Map<string, string>();

  for (const alias of aliases) {
    const field = validatePath(alias.path, alias.source);
    validateSetValue(alias.value, alias.source);
    assertUniquePath(seen, alias.path, alias.source);
    setPath(overrides, field.path, alias.value);
  }

  for (const value of set) {
    const override = parseCliSetOverride(value);
    const field = validatePath(override.path, override.source);
    assertUniquePath(seen, override.path, override.source);
    setPath(overrides, field.path, override.value);
  }

  for (const path of unset) {
    const override = parseCliUnsetOverride(path);
    const field = validatePath(override.path, override.source);
    assertUniquePath(seen, override.path, override.source);
    setPath(overrides, field.path, undefined);
  }

  return overrides;
};
