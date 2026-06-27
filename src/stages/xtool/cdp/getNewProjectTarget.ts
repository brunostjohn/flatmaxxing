import CDP from "chrome-remote-interface";
import { XToolError } from "@/errors";
import { Array, Effect, Option } from "effect";
import { xToolStudioCdpHost, xToolStudioCdpPort } from "../process";
import type { XToolStudioRuntimeOptions } from "../process";
import { getTargets } from "./getTargets";
import type { XToolCdpTarget } from "./schema";

const connectCdpUnsafe = (
  target: XToolCdpTarget,
  options?: Partial<XToolStudioRuntimeOptions>,
) =>
  CDP({
    host: options?.cdpHost ?? xToolStudioCdpHost,
    port: options?.cdpPort ?? xToolStudioCdpPort,
    target: target.id,
  });

export const getNewProjectTarget = Effect.fn("flatmaxx.xtool.getEditor")(
  function* (options?: Partial<XToolStudioRuntimeOptions>) {
    const targets = yield* getTargets(options);

    const target = Array.findFirst(
      targets,
      (t) =>
        t.type === "page" &&
        t.url === "atomm://renderer/editor/" &&
        (t.title ?? "").includes("Untitled"),
    );

    if (Option.isNone(target)) {
      return yield* Effect.fail(
        new XToolError({ message: "No new project target found." }),
      );
    }

    return yield* Effect.tryPromise({
      try: () => connectCdpUnsafe(target.value, options),
      catch: (cause) =>
        new XToolError({
          message: "Unable to connect to xTool Studio editor.",
          cause,
        }),
    });
  },
);
