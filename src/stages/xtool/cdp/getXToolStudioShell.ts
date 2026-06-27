import CDP from "chrome-remote-interface";
import { XToolError } from "@/errors";
import { Array, Effect, Option } from "effect";
import { xToolStudioCdpHost, xToolStudioCdpPort } from "../process";
import type { XToolStudioRuntimeOptions } from "../process";
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

export const getXToolStudioShell = Effect.fn("flatmaxx.xtool.getShell")(
  function* (
    targets: readonly XToolCdpTarget[],
    options?: Partial<XToolStudioRuntimeOptions>,
  ) {
    const target = Array.findFirst(
      targets,
      (t) => t.type === "page" && t.url === "atomm://renderer/shell",
    );

    if (Option.isNone(target)) {
      return yield* Effect.fail(
        new XToolError({ message: "No xTool Studio shell found." }),
      );
    }

    return yield* Effect.tryPromise({
      try: () => connectCdpUnsafe(target.value, options),
      catch: (cause) =>
        new XToolError({
          message: "Unable to connect to xTool Studio shell.",
          cause,
        }),
    });
  },
);
