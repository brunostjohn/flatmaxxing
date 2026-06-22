import type { Client } from "chrome-remote-interface";
import { Duration, Effect } from "effect";
import { cdpClickOn, cdpTypeIn, runScriptInXToolStudio } from "../cdp";
import type { RectBounds } from "./types";

export const typeIntoXToolSetting = Effect.fn("flatmaxx.xtool.typeIntoSetting")(
  function* (
    boxScript: string,
    value: string,
    { Runtime, Input }: Pick<Client, "Runtime" | "Input">,
  ) {
    const { x, y, width, height }: RectBounds = yield* runScriptInXToolStudio(
      boxScript,
      Runtime,
      true,
    );
    yield* cdpClickOn(x + width / 2, y + height / 2, Input);
    yield* cdpTypeIn(value, Input, true);
    yield* Effect.sleep(Duration.millis(500));
  },
);
