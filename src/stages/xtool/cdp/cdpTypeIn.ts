import type { Client } from "chrome-remote-interface";
import { Effect } from "effect";

export const cdpTypeIn = Effect.fn("flatmaxx.xtool.cdpTypeIn")(function* (
  text: string,
  Input: Client["Input"],
  pressEnterWhenDone: boolean = false,
) {
  yield* Effect.promise(() =>
    Input.dispatchKeyEvent({
      type: "keyDown",
      modifiers: 4,
      key: "a",
      code: "KeyA",
      windowsVirtualKeyCode: 65,
      commands: ["selectAll"],
    }),
  );

  yield* Effect.promise(() =>
    Input.dispatchKeyEvent({
      type: "keyUp",
      modifiers: 4,
      key: "a",
      code: "KeyA",
      windowsVirtualKeyCode: 65,
    }),
  );

  yield* Effect.promise(() =>
    Input.insertText({
      text,
    }),
  );

  if (pressEnterWhenDone) {
    yield* Effect.promise(() =>
      Input.dispatchKeyEvent({
        type: "keyDown",
        key: "Enter",
        code: "Enter",
        windowsVirtualKeyCode: 13,
      }),
    );

    yield* Effect.promise(() =>
      Input.dispatchKeyEvent({
        type: "keyUp",
        key: "Enter",
        code: "Enter",
        windowsVirtualKeyCode: 13,
      }),
    );
  }
});
