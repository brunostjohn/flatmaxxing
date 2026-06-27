import { ConfigFileSchema } from "@/config";
import { merge } from "@/config/merge";
import { Schema } from "effect";
import { dirname } from "node:path";
import type { BuildConfigEditorSaveResult, ConfigEditorTarget } from "../types";
import {
  decodeConfigSync,
  loadExtendsRaw,
  normalizeConfigSync,
  readExtendsFromRaw,
} from "./bridge";
import { parseOptions } from "./constants";
import {
  buildSparseConfigFromFormValues,
  renderSparseConfigToml,
} from "./formValues";
import { parseTomlText } from "./tomlValues";

export const decodeConfigEditorSparse = (sparse: Record<string, unknown>) =>
  Schema.decodeUnknownSync(ConfigFileSchema, parseOptions)(sparse);

const validateRenderedConfigToml = (toml: string, targetPath: string) => {
  const raw = parseTomlText(toml, targetPath);
  const inherited = loadExtendsRaw(
    targetPath,
    readExtendsFromRaw(targetPath, raw),
  );
  const decoded = decodeConfigSync(merge(inherited, raw));
  return normalizeConfigSync(decoded, dirname(targetPath));
};

export const buildConfigEditorSave = (
  target: ConfigEditorTarget,
  formValues: Record<string, unknown>,
): BuildConfigEditorSaveResult => {
  const sparse = buildSparseConfigFromFormValues(target, formValues);
  const toml = renderSparseConfigToml(sparse);
  validateRenderedConfigToml(toml, target.targetPath);

  return {
    targetPath: target.targetPath,
    toml,
    sparse,
  };
};
