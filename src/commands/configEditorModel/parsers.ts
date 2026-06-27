import { ConfigError } from "@/errors";
import type { ConfigEditorField } from "../types";
import { pathKey } from "./fields";
import { parseTomlLiteral, stringValue } from "./tomlValues";

const parseNumber = (value: unknown, label: string): number => {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) {
    throw new ConfigError({ message: `${label} must be a finite number.` });
  }
  return number;
};

const parseInteger = (value: unknown, label: string): number => {
  const number = parseNumber(value, label);
  if (!Number.isInteger(number)) {
    throw new ConfigError({ message: `${label} must be an integer.` });
  }
  return number;
};

export const parseFieldValue = (
  field: ConfigEditorField,
  formValue: unknown,
): unknown | undefined => {
  const label = pathKey(field.path);

  switch (field.kind) {
    case "boolean":
      return Boolean(formValue);
    case "float":
      return parseNumber(formValue, label);
    case "integer":
      return parseInteger(formValue, label);
    case "numberSelect": {
      const text = stringValue(formValue).trim();
      if (text === "") {
        return undefined;
      }
      return parseNumber(text, label);
    }
    case "optionalFloat": {
      const text = stringValue(formValue).trim();
      return text === "" ? undefined : parseNumber(text, label);
    }
    case "optionalString": {
      const text = stringValue(formValue);
      return text.trim() === "" ? undefined : text;
    }
    case "select": {
      const text = stringValue(formValue);
      return text === "" ? undefined : text;
    }
    case "string":
      return stringValue(formValue);
    case "toml":
      return parseTomlLiteral(stringValue(formValue), label);
  }
};

export const parseSubmittedExtends = (
  value: unknown,
): readonly string[] | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (
    !Array.isArray(value) ||
    value.some((entry) => typeof entry !== "string")
  ) {
    throw new ConfigError({
      message: "extends must be a TOML array of strings.",
    });
  }

  return value;
};
