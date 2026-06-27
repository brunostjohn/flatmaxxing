import { runAppleScript } from "@/macos";
import type { Client } from "chrome-remote-interface";
import { Duration, Effect } from "effect";
import { cdpClickOn, runScriptInXToolStudio } from "../cdp";
import { applescriptEsc, getCanvasBoundingBox } from "../scripts";
import type { RectBounds } from "./types";

export const clearXToolSelection = Effect.fn("flatmaxx.xtool.clearSelection")(
  function* ({ Runtime, Input }: Pick<Client, "Runtime" | "Input">) {
    yield* runAppleScript(applescriptEsc);

    const { x, y, height }: RectBounds = yield* runScriptInXToolStudio(
      getCanvasBoundingBox,
      Runtime,
      true,
    );

    yield* cdpClickOn(x + 2, y + height - 2, Input);
    yield* Effect.sleep(Duration.millis(150));
  },
);
