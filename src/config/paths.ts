import { Effect, Path } from "effect";
import { homedir } from "node:os";

export const expandHome = Effect.fn("flatmaxx.config.expandHome")(function* (
  path: string,
) {
  const pathService = yield* Path.Path;

  if (path === "~") {
    return yield* Effect.sync(() => homedir());
  }

  if (path.startsWith("~/")) {
    const home = yield* Effect.sync(() => homedir());
    return pathService.resolve(home, path.slice(2));
  }

  return path;
});

export const resolveFrom = Effect.fn("flatmaxx.config.resolveFrom")(function* (
  baseDirectory: string,
  path: string,
) {
  const pathService = yield* Path.Path;
  const expanded = yield* expandHome(path);
  return pathService.isAbsolute(expanded)
    ? expanded
    : pathService.resolve(baseDirectory, expanded);
});

export const resolveSibling = Effect.fn("flatmaxx.config.resolveSibling")(
  function* (fromFile: string, path: string) {
    const pathService = yield* Path.Path;
    return yield* resolveFrom(pathService.dirname(fromFile), path);
  },
);
