import { isRecord, type TomlValue } from "@/config";
import { ConfigError } from "@/errors";
import { Array, Record } from "effect";
import { parse } from "toml";

export const parseTomlText = (
  text: string,
  filePath = "config editor input",
): Record<string, unknown> => {
  const parsed = parse(text) as unknown;

  if (!isRecord(parsed)) {
    throw new ConfigError({
      message: `Config file "${filePath}" must contain a TOML table.`,
    });
  }

  return parsed;
};

export const asTomlValue = (value: unknown, label: string): TomlValue => {
  if (
    typeof value === "string" ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => asTomlValue(entry, label));
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        entry === undefined ? undefined : asTomlValue(entry, label),
      ]),
    );
  }

  throw new ConfigError({
    message: `${label} must be a TOML string, number, boolean, array, or inline table.`,
  });
};

export const parseTomlLiteral = (
  value: string,
  label: string,
): TomlValue | undefined => {
  const trimmed = value.trim();

  if (trimmed === "") {
    return undefined;
  }

  const parsed = parseTomlText(`value = ${trimmed}`, label).value;
  return asTomlValue(parsed, label);
};

export const getPath = (value: unknown, path: readonly string[]): unknown =>
  Array.reduce(path, value, (current, part) =>
    isRecord(current) ? current[part] : undefined,
  );

export const setPath = (
  target: Record<string, unknown>,
  path: readonly string[],
  value: unknown,
): Record<string, unknown> => {
  const [head, ...rest] = path;

  if (head === undefined) {
    return target;
  }

  if (rest.length === 0) {
    return Record.set(target, head, value);
  }

  const existing = target[head];
  const child = isRecord(existing) ? existing : {};
  return Record.set(target, head, setPath(child, rest, value));
};

export const pruneEmptyRecords = (value: unknown): unknown => {
  if (Array.isArray(value) || !isRecord(value)) {
    return value;
  }

  const entries = Object.entries(value)
    .map(([key, entry]) => [key, pruneEmptyRecords(entry)] as const)
    .filter(([, entry]) => entry !== undefined);

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries);
};

export const deepEqual = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) {
    return true;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) {
      return false;
    }
    return (
      left.length === right.length &&
      left.every((entry, index) => deepEqual(entry, right[index]))
    );
  }

  if (isRecord(left) || isRecord(right)) {
    if (!isRecord(left) || !isRecord(right)) {
      return false;
    }
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) {
      return false;
    }
    return leftKeys.every((key) => deepEqual(left[key], right[key]));
  }

  return false;
};

export const stringValue = (value: unknown): string =>
  typeof value === "string"
    ? value
    : value === undefined || value === null
      ? ""
      : String(value);
