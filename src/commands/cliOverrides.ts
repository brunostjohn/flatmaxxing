import { isRecord, type TomlValue } from "@/config";
import { CliError } from "@/errors";
import { Array, Option, Record } from "effect";
import { parse } from "toml";
import {
  configEditorFields,
  type ConfigEditorFieldKind,
} from "./configEditorModel";
import { setPath } from "./configEditorModel/tomlValues";

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

export interface CliAliasOverride {
  readonly path: string;
  readonly value: unknown;
  readonly source: string;
}

export interface BuildCliOverridesOptions {
  readonly set?: readonly string[] | undefined;
  readonly unset?: readonly string[] | undefined;
  readonly aliases?: readonly CliAliasOverride[] | undefined;
}

interface ConfigFieldMetadata {
  readonly path: readonly string[];
  readonly kind: ConfigEditorFieldKind;
}

interface ResolvedOverride {
  readonly path: readonly string[];
  readonly value: unknown;
  readonly source: string;
}

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
  const parsed = parseTomlValueText(value, source);

  if (!isRecord(parsed)) {
    throw new CliError({ message: `${source} must parse to a TOML value.` });
  }

  return parsed.value;
};

const parseTomlValueText = (value: string, source: string): unknown => {
  try {
    return parse(`value = ${value}`) as unknown;
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    throw new CliError({
      message: `${source} has invalid TOML literal: ${message}`,
      cause,
    });
  }
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

  throw new CliError({
    message: `${source} must be a TOML string, number, boolean, array, or inline table.`,
  });
};

const validatePath = (path: string, source: string): ConfigFieldMetadata => {
  const field = fieldsByPath.get(path);

  if (!field) {
    throw new CliError({
      message: `${source} references unknown config path "${path}". Use one of: ${Array.fromIterable(
        fieldsByPath.keys(),
      ).join(", ")}.`,
    });
  }

  if (path === "extends") {
    throw new CliError({
      message: `${source} cannot override extends from the command line.`,
    });
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
    throw new CliError({ message: `${source} must use path=value syntax.` });
  }

  const path = text.slice(0, equalsIndex).trim();
  const valueText = text.slice(equalsIndex + 1).trim();

  if (path === "" || valueText === "") {
    throw new CliError({
      message: `${source} must include both a path and a value.`,
    });
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
    throw new CliError({
      message: `${source} can only clear optional config paths.`,
    });
  }

  return {
    type: "unset",
    path: trimmedPath,
    source,
  };
};

const aliasOverride = (alias: CliAliasOverride): ResolvedOverride => {
  const field = validatePath(alias.path, alias.source);
  validateSetValue(alias.value, alias.source);
  return { path: field.path, value: alias.value, source: alias.source };
};

const setOverride = (text: string): ResolvedOverride => {
  const override = parseCliSetOverride(text);
  const field = validatePath(override.path, override.source);
  return { path: field.path, value: override.value, source: override.source };
};

const unsetOverride = (path: string): ResolvedOverride => {
  const override = parseCliUnsetOverride(path);
  const field = validatePath(override.path, override.source);
  return { path: field.path, value: undefined, source: override.source };
};

const assertUniquePaths = (overrides: readonly ResolvedOverride[]) => {
  const grouped = Array.groupBy(overrides, (override) =>
    pathKey(override.path),
  );
  const duplicate = Array.findFirst(
    Record.toEntries(grouped),
    ([, entries]) => entries.length > 1,
  );

  if (Option.isSome(duplicate)) {
    const [path, entries] = duplicate.value;
    throw new CliError({
      message: `Config path "${path}" was overridden more than once (${entries
        .map((entry) => entry.source)
        .join(", ")}).`,
    });
  }
};

export const buildCliOverrides = ({
  set = [],
  unset = [],
  aliases = [],
}: BuildCliOverridesOptions): Record<string, unknown> => {
  const resolved: readonly ResolvedOverride[] = [
    ...Array.map(aliases, aliasOverride),
    ...Array.map(set, setOverride),
    ...Array.map(unset, unsetOverride),
  ];

  assertUniquePaths(resolved);

  return Array.reduce(
    resolved,
    {} as Record<string, unknown>,
    (overrides, override) => setPath(overrides, override.path, override.value),
  );
};
