import type { Client } from "chrome-remote-interface";
import { Effect } from "effect";

export const cdpClickOn = Effect.fn("flatmaxx.xtool.cdpClickOn")(function* (
  x: number,
  y: number,
  Input: Client["Input"],
) {
  yield* Effect.promise(() =>
    Input.dispatchMouseEvent({
      type: "mouseMoved",
      x,
      y,
      button: "none",
    }),
  );

  yield* Effect.promise(() =>
    Input.dispatchMouseEvent({
      type: "mousePressed",
      x,
      y,
      button: "left",
      clickCount: 1,
    }),
  );

  yield* Effect.promise(() =>
    Input.dispatchMouseEvent({
      type: "mouseReleased",
      x,
      y,
      button: "left",
      clickCount: 1,
    }),
  );
});
