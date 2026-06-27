import type { Client } from "chrome-remote-interface";
import { XToolError } from "@/errors";
import { Effect } from "effect";

const moveMouseUnsafe = (Input: Client["Input"], x: number, y: number) =>
  Input.dispatchMouseEvent({
    type: "mouseMoved",
    x,
    y,
    button: "none",
  });

const pressMouseUnsafe = (Input: Client["Input"], x: number, y: number) =>
  Input.dispatchMouseEvent({
    type: "mousePressed",
    x,
    y,
    button: "left",
    clickCount: 1,
  });

const releaseMouseUnsafe = (Input: Client["Input"], x: number, y: number) =>
  Input.dispatchMouseEvent({
    type: "mouseReleased",
    x,
    y,
    button: "left",
    clickCount: 1,
  });

const runInputCommand = (command: () => PromiseLike<unknown>) =>
  Effect.tryPromise({
    try: () => command(),
    catch: (cause) =>
      new XToolError({ message: "Unable to send xTool mouse input.", cause }),
  });

export const cdpClickOn = Effect.fn("flatmaxx.xtool.cdpClickOn")(function* (
  x: number,
  y: number,
  Input: Client["Input"],
) {
  yield* runInputCommand(() => moveMouseUnsafe(Input, x, y));
  yield* runInputCommand(() => pressMouseUnsafe(Input, x, y));
  yield* runInputCommand(() => releaseMouseUnsafe(Input, x, y));
});
