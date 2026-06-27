import { Array, Effect, FileSystem, Option, Path } from "effect";
import { EXECUTE_BITS } from "./constants";
import type { DependencyResolution } from "./types";

export interface DependencyResolverOptions {
  readonly cwd?: string | undefined;
  readonly env?: { readonly PATH?: string | undefined } | undefined;
}

interface CandidateFacts {
  readonly path: string;
  readonly isFile: boolean;
  readonly isDirectory: boolean;
  readonly isExecutable: boolean;
}

const hasPathSeparator = (value: string) =>
  value.includes("/") || value.includes("\\");

const inspectCandidate = Effect.fn("flatmaxx.preflight.inspectCandidate")(
  function* (path: string) {
    const fs = yield* FileSystem.FileSystem;
    const info = yield* fs.stat(path).pipe(Effect.option);

    return Option.match(info, {
      onNone: () => Option.none<CandidateFacts>(),
      onSome: (stats) =>
        Option.some<CandidateFacts>({
          path,
          isFile: stats.type === "File",
          isDirectory: stats.type === "Directory",
          isExecutable: (stats.mode & EXECUTE_BITS) !== 0,
        }),
    });
  },
);

const missingFromFacts = (
  trimmed: string,
  notOnPathMessage: string,
  facts: readonly CandidateFacts[],
): DependencyResolution =>
  Option.match(
    Array.findFirst(facts, (fact) => fact.isFile && !fact.isExecutable),
    {
      onSome: (fact) => ({
        status: "missing",
        message: `"${trimmed}" exists but is not executable.`,
        detail: fact.path,
      }),
      onNone: () =>
        Option.match(
          Array.findFirst(facts, (fact) => !fact.isFile),
          {
            onSome: (fact) => ({
              status: "missing",
              message: `"${trimmed}" exists but is not a file.`,
              detail: fact.path,
            }),
            onNone: () => ({ status: "missing", message: notOnPathMessage }),
          },
        ),
    },
  );

const pathEntries = (envPath: string | undefined, separator: string) =>
  (envPath ?? "")
    .split(separator)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

export const resolveExecutableDependency = Effect.fn(
  "flatmaxx.preflight.resolveExecutableDependency",
)(function* (value: string, options: DependencyResolverOptions = {}) {
  const path = yield* Path.Path;
  const trimmed = value.trim();
  const cwd = options.cwd ?? process.cwd();

  if (trimmed.length === 0) {
    return {
      status: "missing",
      message: "No executable path configured.",
    } satisfies DependencyResolution;
  }

  const explicit = path.isAbsolute(trimmed)
    ? trimmed
    : path.resolve(cwd, trimmed);

  const candidates = hasPathSeparator(trimmed)
    ? [explicit]
    : pathEntries(
        options.env?.PATH ?? process.env.PATH,
        path.sep === "\\" ? ";" : ":",
      ).map((entry) => path.join(entry, trimmed));

  if (candidates.length === 0) {
    return {
      status: "missing",
      message: `"${trimmed}" was not found because PATH is empty.`,
    } satisfies DependencyResolution;
  }

  const facts = Array.getSomes(
    yield* Effect.forEach(candidates, inspectCandidate),
  );

  const found = Array.findFirst(
    facts,
    (fact) => fact.isFile && fact.isExecutable,
  );

  return Option.match(found, {
    onSome: (fact) =>
      ({ status: "found", path: fact.path }) satisfies DependencyResolution,
    onNone: () =>
      missingFromFacts(
        trimmed,
        hasPathSeparator(trimmed)
          ? `"${explicit}" does not exist.`
          : `"${trimmed}" was not found on PATH.`,
        facts,
      ),
  });
});

export const resolveAppDependency = Effect.fn(
  "flatmaxx.preflight.resolveAppDependency",
)(function* (value: string, options: DependencyResolverOptions = {}) {
  const path = yield* Path.Path;
  const trimmed = value.trim();
  const cwd = options.cwd ?? process.cwd();

  if (trimmed.length === 0) {
    return {
      status: "missing",
      message: "No app path configured.",
    } satisfies DependencyResolution;
  }

  const resolved = path.isAbsolute(trimmed)
    ? trimmed
    : path.resolve(cwd, trimmed);
  const facts = yield* inspectCandidate(resolved);

  return Option.match(facts, {
    onNone: () =>
      ({
        status: "missing",
        message: `"${resolved}" does not exist.`,
      }) satisfies DependencyResolution,
    onSome: (fact) =>
      fact.isDirectory
        ? ({ status: "found", path: resolved } satisfies DependencyResolution)
        : ({
            status: "missing",
            message: `"${resolved}" exists but is not an app bundle directory.`,
          } satisfies DependencyResolution),
  });
});
