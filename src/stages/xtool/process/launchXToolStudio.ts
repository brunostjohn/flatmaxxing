import { Effect } from "effect";
import { XToolError } from "@/errors";
import { runCollectingBoth } from "@/process";
import {
  getXToolStudioOpenArgs,
  xToolStudioCdpPort,
  xToolStudioOpenArgs,
} from "./constants";
import type { XToolStudioProcess, XToolStudioRuntimeOptions } from "./types";
import { waitForXToolStudioProcessIds } from "./waitForXToolStudioProcessIds";

export const launchXToolStudio = Effect.fn("flatmaxx.xtool.process.launch")(
  function* (options?: Partial<XToolStudioRuntimeOptions>) {
    const openArgs =
      options === undefined
        ? xToolStudioOpenArgs
        : getXToolStudioOpenArgs({
            appPath: options.appPath,
            cdpPort: options.cdpPort ?? xToolStudioCdpPort,
          });
    const result = yield* runCollectingBoth("open", openArgs);

    if (result.exitCode !== 0) {
      return yield* Effect.fail(
        new XToolError({
          message: `Failed to open xTool Studio with CDP flags: ${result.stderr || result.stdout}`,
        }),
      );
    }

    const processIds = yield* waitForXToolStudioProcessIds();

    return { processIds } satisfies XToolStudioProcess;
  },
);
