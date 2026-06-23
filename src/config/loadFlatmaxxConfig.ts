import { ConfigFileSchema, type ConfigFile } from "@/config/schema";
import { Effect, Schema } from "effect";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parse } from "toml";
import { deepMerge, isRecord } from "./deepMerge";
import { normalizeConfig } from "./normalizeConfig";
import { resolveFrom, resolveSibling } from "./paths";
import type { ResolvedConfig } from "./types";

export type LoadFlatmaxxConfigOptions = {
  readonly projectRoot: string;
  readonly configPath?: string | undefined;
  readonly cliOverrides?: {
    readonly kicadCli?: string | undefined;
  };
};

const parseOptions = {
  errors: "all",
  onExcessProperty: "error",
} as const;

export const readToml = (filePath: string): Record<string, unknown> => {
  const text = readFileSync(filePath, "utf8");
  const parsed = parse(text) as unknown;

  if (!isRecord(parsed)) {
    throw new Error(`Config file "${filePath}" must contain a TOML table.`);
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
    throw new Error(
      `Config file "${filePath}" has invalid extends; expected an array of strings.`,
    );
  }

  return value;
};

export const loadConfigFile = (
  filePath: string,
  loading: readonly string[] = [],
): Effect.Effect<Record<string, unknown>, Error> =>
  Effect.try({
    try: () => {
      if (loading.includes(filePath)) {
        throw new Error(
          `Config extends cycle detected: ${[...loading, filePath].join(" -> ")}`,
        );
      }

      if (!existsSync(filePath)) {
        throw new Error(`Config file "${filePath}" does not exist.`);
      }

      return readToml(filePath);
    },
    catch: (cause) =>
      cause instanceof Error ? cause : new Error(String(cause)),
  }).pipe(
    Effect.flatMap((raw) => {
      const nextStack = [...loading, filePath];
      return Effect.gen(function* () {
        const parents = readExtends(filePath, raw).map((path) =>
          resolveSibling(filePath, path),
        );
        let inherited: Record<string, unknown> = {};

        for (const parentPath of parents) {
          const parentConfig = yield* loadConfigFile(parentPath, nextStack);
          inherited = deepMerge(inherited, parentConfig);
        }

        return deepMerge(inherited, raw);
      });
    }),
  );

export const decodeConfig = (
  raw: Record<string, unknown>,
): Effect.Effect<ConfigFile, Error> =>
  Effect.try({
    try: () => Schema.decodeUnknownSync(ConfigFileSchema, parseOptions)(raw),
    catch: (cause) =>
      cause instanceof Error ? cause : new Error(String(cause)),
  });

export const loadFlatmaxxConfig = Effect.fn("flatmaxx.config.load")(function* ({
  projectRoot,
  configPath,
  cliOverrides,
}: LoadFlatmaxxConfigOptions) {
  const resolvedProjectRoot = resolveFrom(process.cwd(), projectRoot);
  const autoConfigPath = resolve(resolvedProjectRoot, "flatmaxxing.toml");
  const requestedConfigPath = configPath
    ? resolveFrom(resolvedProjectRoot, configPath)
    : autoConfigPath;
  const shouldLoad = configPath !== undefined || existsSync(autoConfigPath);
  const configRoot = shouldLoad
    ? dirname(requestedConfigPath)
    : resolvedProjectRoot;

  const raw = shouldLoad
    ? yield* loadConfigFile(requestedConfigPath)
    : ({} as Record<string, unknown>);
  const decoded = yield* decodeConfig(raw);
  const withOverrides =
    cliOverrides?.kicadCli === undefined
      ? decoded
      : {
          ...decoded,
          dependencies: {
            ...decoded.dependencies,
            kicadCli: cliOverrides.kicadCli,
          },
        };

  return normalizeConfig(withOverrides, configRoot);
});
