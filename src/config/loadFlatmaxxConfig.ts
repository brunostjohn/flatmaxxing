import { ConfigError } from "@/errors";
import { ConfigFileSchema, type ConfigFile } from "@/config/schema";
import { Array, Effect, Path, Schema } from "effect";
import { existsSync, readFileSync } from "node:fs";
import { parse } from "toml";
import { isRecord } from "./isRecord";
import { merge } from "./merge";
import { normalizeConfig } from "./normalizeConfig";
import { resolveFrom, resolveSibling } from "./paths";

export interface LoadFlatmaxxConfigOptions {
  readonly projectRoot: string;
  readonly configPath?: string | undefined;
  readonly cliOverrides?: Record<string, unknown> | undefined;
}

const parseOptions = {
  errors: "all",
  onExcessProperty: "error",
} as const;

const configFilename = "flatmaxxing.toml";

const toConfigError = (cause: unknown): ConfigError =>
  cause instanceof ConfigError
    ? cause
    : new ConfigError({
        message: cause instanceof Error ? cause.message : String(cause),
        cause,
      });

export const readToml = (filePath: string): Record<string, unknown> => {
  const text = readFileSync(filePath, "utf8");
  const parsed = parse(text) as unknown;

  if (!isRecord(parsed)) {
    throw new ConfigError({
      message: `Config file "${filePath}" must contain a TOML table.`,
    });
  }

  return parsed;
};

export const readExtends = (
  filePath: string,
  raw: Record<string, unknown>,
): string[] => {
  const value = raw.extends;

  if (value === undefined) {
    return [];
  }

  if (
    !Array.isArray(value) ||
    value.some((entry) => typeof entry !== "string")
  ) {
    throw new ConfigError({
      message: `Config file "${filePath}" has invalid extends; expected an array of strings.`,
    });
  }

  return Array.filter(
    value,
    (entry): entry is string => typeof entry === "string",
  );
};

export const loadConfigFile = (
  filePath: string,
  loading: readonly string[] = [],
): Effect.Effect<Record<string, unknown>, ConfigError, Path.Path> =>
  Effect.try({
    try: () => {
      if (loading.includes(filePath)) {
        throw new ConfigError({
          message: `Config extends cycle detected: ${[...loading, filePath].join(" -> ")}`,
        });
      }

      if (!existsSync(filePath)) {
        throw new ConfigError({
          message: `Config file "${filePath}" does not exist.`,
        });
      }

      return readToml(filePath);
    },
    catch: toConfigError,
  }).pipe(
    Effect.flatMap((raw) =>
      Effect.gen(function* () {
        const nextStack = [...loading, filePath];
        const parents = yield* Effect.forEach(
          readExtends(filePath, raw),
          (path) => resolveSibling(filePath, path),
        );
        const parentConfigs = yield* Effect.forEach(parents, (parentPath) =>
          loadConfigFile(parentPath, nextStack),
        );
        const inherited = Array.reduce(
          parentConfigs,
          {} as Record<string, unknown>,
          (accumulated, parentConfig) => merge(accumulated, parentConfig),
        );

        return merge(inherited, raw);
      }),
    ),
  );

export const decodeConfig = (
  raw: Record<string, unknown>,
): Effect.Effect<ConfigFile, ConfigError> =>
  Effect.try({
    try: () => Schema.decodeUnknownSync(ConfigFileSchema, parseOptions)(raw),
    catch: toConfigError,
  });

export const loadFlatmaxxConfig = Effect.fn("flatmaxx.config.load")(function* ({
  projectRoot,
  configPath,
  cliOverrides,
}: LoadFlatmaxxConfigOptions) {
  const pathService = yield* Path.Path;
  const cwd = yield* Effect.sync(() => process.cwd());
  const resolvedProjectRoot = yield* resolveFrom(cwd, projectRoot);
  const autoConfigPath = pathService.resolve(
    resolvedProjectRoot,
    configFilename,
  );
  const requestedConfigPath =
    configPath === undefined
      ? autoConfigPath
      : yield* resolveFrom(resolvedProjectRoot, configPath);
  const shouldLoad =
    configPath !== undefined ||
    (yield* Effect.sync(() => existsSync(autoConfigPath)));
  const configRoot = shouldLoad
    ? pathService.dirname(requestedConfigPath)
    : resolvedProjectRoot;

  const raw = shouldLoad
    ? yield* loadConfigFile(requestedConfigPath)
    : ({} as Record<string, unknown>);
  const withOverrides =
    cliOverrides === undefined ? raw : merge(raw, cliOverrides);
  const decoded = yield* decodeConfig(withOverrides);

  return yield* normalizeConfig(decoded, configRoot);
});
