import {
  decodeConfig,
  loadConfigFile,
  normalizeConfig,
  readExtends,
  resolveFrom,
  resolveSibling,
  type ConfigFile,
} from "@/config";
import { merge } from "@/config/merge";
import { Array, Effect, Path } from "effect";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { userConfigExtendsPath, userConfigFilename } from "./constants";

export const defaultUserConfigPath = () =>
  resolve(homedir(), userConfigFilename);

const runSyncWithPath = <A, E>(effect: Effect.Effect<A, E, Path.Path>): A =>
  Effect.runSync(effect.pipe(Effect.provide(Path.layer)));

export const decodeConfigSync = (raw: Record<string, unknown>): ConfigFile =>
  Effect.runSync(decodeConfig(raw));

export const loadConfigFileSync = (filePath: string): Record<string, unknown> =>
  runSyncWithPath(loadConfigFile(filePath));

export const resolveFromSync = (baseDirectory: string, path: string): string =>
  runSyncWithPath(resolveFrom(baseDirectory, path));

export const resolveSiblingSync = (fromFile: string, path: string): string =>
  runSyncWithPath(resolveSibling(fromFile, path));

export const normalizeConfigSync = (config: ConfigFile, configRoot: string) =>
  runSyncWithPath(normalizeConfig(config, configRoot));

export const readExtendsFromRaw = (
  filePath: string,
  raw: Record<string, unknown>,
): readonly string[] => readExtends(filePath, raw);

export const loadExtendsRaw = (
  filePath: string,
  extendsEntries: readonly string[],
): Record<string, unknown> =>
  Array.reduce(
    extendsEntries,
    {} as Record<string, unknown>,
    (inherited, entry) =>
      merge(inherited, loadConfigFileSync(resolveSiblingSync(filePath, entry))),
  );

const extendsIncludesPath = (
  filePath: string,
  extendsEntries: readonly string[],
  candidatePath: string,
): boolean =>
  extendsEntries.some(
    (entry) => resolveSiblingSync(filePath, entry) === resolve(candidatePath),
  );

export const ensureProjectUserExtends = (
  filePath: string,
  extendsEntries: readonly string[],
  userConfigPath: string,
): readonly string[] => {
  const resolvedUserConfigPath = resolve(userConfigPath);
  const extendsEntry =
    resolvedUserConfigPath === defaultUserConfigPath()
      ? userConfigExtendsPath
      : resolvedUserConfigPath;

  return existsSync(resolvedUserConfigPath) &&
    !extendsIncludesPath(filePath, extendsEntries, resolvedUserConfigPath)
    ? [...extendsEntries, extendsEntry]
    : extendsEntries;
};
