import { merge } from "@/config/merge";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type {
  ConfigEditorTarget,
  PrepareConfigEditorTargetOptions,
} from "../types";
import { projectConfigFilename } from "./constants";
import {
  decodeConfigSync,
  defaultUserConfigPath,
  ensureProjectUserExtends,
  loadExtendsRaw,
  readExtendsFromRaw,
  resolveFromSync,
} from "./bridge";
import { readToml } from "@/config";

const withoutExtends = (
  raw: Record<string, unknown>,
): Record<string, unknown> => {
  const { extends: _extends, ...rest } = raw;
  return rest;
};

const prepareUserTarget = (
  resolvedCwd: string,
  userConfigPath: string,
): ConfigEditorTarget => {
  const targetPath = resolveFromSync(resolvedCwd, userConfigPath);
  const currentRaw = existsSync(targetPath) ? readToml(targetPath) : {};
  const baselineRaw: Record<string, unknown> = {};

  return {
    mode: "user",
    targetPath,
    configRoot: dirname(targetPath),
    userConfigPath: targetPath,
    baselineRaw,
    currentRaw,
    baselineConfig: decodeConfigSync(baselineRaw),
    currentConfig: decodeConfigSync(currentRaw),
  };
};

const prepareProjectTarget = (
  resolvedCwd: string,
  kicadProject: string | undefined,
  configPath: string | undefined,
  userConfigPath: string,
): ConfigEditorTarget => {
  const projectRoot = resolveFromSync(resolvedCwd, kicadProject ?? ".");
  const targetPath = configPath
    ? resolveFromSync(projectRoot, configPath)
    : resolve(projectRoot, projectConfigFilename);
  const targetRaw = existsSync(targetPath) ? readToml(targetPath) : {};
  const targetExtends = ensureProjectUserExtends(
    targetPath,
    readExtendsFromRaw(targetPath, targetRaw),
    resolveFromSync(resolvedCwd, userConfigPath),
  );
  const baselineRaw = loadExtendsRaw(targetPath, targetExtends);
  const currentRaw = merge(baselineRaw, withoutExtends(targetRaw));

  if (targetExtends.length > 0) {
    currentRaw.extends = [...targetExtends];
  }

  return {
    mode: "project",
    targetPath,
    configRoot: dirname(targetPath),
    userConfigPath: resolveFromSync(resolvedCwd, userConfigPath),
    baselineRaw,
    currentRaw,
    baselineConfig: decodeConfigSync(baselineRaw),
    currentConfig: decodeConfigSync(currentRaw),
  };
};

export const prepareConfigEditorTarget = ({
  cwd = process.cwd(),
  kicadProject,
  configPath,
  user = false,
  userConfigPath = defaultUserConfigPath(),
}: PrepareConfigEditorTargetOptions = {}): ConfigEditorTarget => {
  const resolvedCwd = resolve(cwd);

  return user
    ? prepareUserTarget(resolvedCwd, userConfigPath)
    : prepareProjectTarget(
        resolvedCwd,
        kicadProject,
        configPath,
        userConfigPath,
      );
};
