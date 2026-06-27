import {
  renderTomlAssignments,
  renderTomlInlineValue,
  renderTomlSection,
  type ConfigFile,
  type TomlValue,
} from "@/config";
import { Array, Record, Result } from "effect";
import type { ConfigEditorTarget } from "../types";
import { defaultUserConfigPath, ensureProjectUserExtends } from "./bridge";
import { configEditorFields, pathKey } from "./fields";
import { parseFieldValue, parseSubmittedExtends } from "./parsers";
import {
  asTomlValue,
  deepEqual,
  getPath,
  pruneEmptyRecords,
  setPath,
  stringValue,
} from "./tomlValues";

const formValueForField = (
  config: ConfigFile,
  field: (typeof configEditorFields)[number],
): string | number | boolean => {
  const value = getPath(config, field.path);

  switch (field.kind) {
    case "boolean":
      return Boolean(value);
    case "float":
    case "integer":
      return typeof value === "number" ? value : 0;
    case "numberSelect":
    case "optionalFloat":
    case "optionalString":
    case "select":
    case "string":
      return stringValue(value);
    case "toml":
      return value === undefined
        ? ""
        : renderTomlInlineValue(asTomlValue(value, pathKey(field.path)));
  }
};

export const configToFormValues = (
  config: ConfigFile,
): Record<string, string | number | boolean> =>
  Record.fromEntries(
    Array.map(configEditorFields, (field) => [
      pathKey(field.path),
      formValueForField(config, field),
    ]),
  );

interface SparseAccumulator {
  readonly sparse: Record<string, unknown>;
  readonly submittedExtends: readonly string[] | undefined;
}

const foldParsedIntoSparse = (
  target: ConfigEditorTarget,
  accumulator: SparseAccumulator,
  field: (typeof configEditorFields)[number],
  key: string,
  parsed: unknown,
): SparseAccumulator => {
  if (key === "extends") {
    return {
      ...accumulator,
      submittedExtends: parseSubmittedExtends(parsed),
    };
  }

  if (parsed === undefined) {
    return accumulator;
  }

  const baseline = getPath(target.baselineConfig, field.path);
  if (deepEqual(parsed, baseline)) {
    return accumulator;
  }

  return {
    ...accumulator,
    sparse: setPath(accumulator.sparse, field.path, parsed),
  };
};

export const buildSparseConfigFromFormValues = (
  target: ConfigEditorTarget,
  formValues: Record<string, unknown>,
): Record<string, unknown> => {
  const { sparse, submittedExtends } = Array.reduce(
    configEditorFields,
    { sparse: {}, submittedExtends: undefined } as SparseAccumulator,
    (accumulator, field) =>
      foldParsedIntoSparse(
        target,
        accumulator,
        field,
        pathKey(field.path),
        parseFieldValue(field, formValues[pathKey(field.path)]),
      ),
  );

  const baseExtends = submittedExtends ?? target.currentConfig.extends;
  const outputExtends =
    target.mode === "project"
      ? ensureProjectUserExtends(
          target.targetPath,
          baseExtends,
          target.userConfigPath ?? defaultUserConfigPath(),
        )
      : baseExtends;

  const withExtends =
    outputExtends.length > 0
      ? setPath(sparse, ["extends"], [...outputExtends])
      : sparse;

  return (pruneEmptyRecords(withExtends) ?? {}) as Record<string, unknown>;
};

interface SectionEntry {
  readonly sectionName: string;
  readonly key: string;
  readonly value: TomlValue;
}

const renderSection = (
  sectionName: string,
  entries: readonly SectionEntry[],
): string =>
  renderTomlSection(
    sectionName,
    Array.map(entries, (entry) => [entry.key, entry.value] as const),
  );

export const renderSparseConfigToml = (
  sparse: Record<string, unknown>,
): string => {
  const presentEntries = Array.filterMap(configEditorFields, (field) => {
    const value = getPath(sparse, field.path);
    if (value === undefined) {
      return Result.failVoid;
    }
    return Result.succeed({
      sectionName: field.path.slice(0, -1).join("."),
      key: field.path[field.path.length - 1]!,
      value: asTomlValue(value, pathKey(field.path)),
    } satisfies SectionEntry);
  });

  const grouped = Array.groupBy(presentEntries, (entry) => entry.sectionName);
  const topLevel = grouped[""] ?? [];
  const sectionNames = Object.keys(grouped).filter((name) => name !== "");

  const renderedParts = [
    renderTomlAssignments(
      Array.map(topLevel, (entry) => [entry.key, entry.value] as const),
    ),
    ...Array.map(sectionNames, (name) => renderSection(name, grouped[name]!)),
  ].filter((part) => part.trim() !== "");

  return renderedParts.length === 0 ? "" : `${renderedParts.join("\n\n")}\n`;
};
