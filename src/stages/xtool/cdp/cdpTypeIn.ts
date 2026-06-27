import type { Client } from "chrome-remote-interface";
import { XToolError } from "@/errors";
import { Effect } from "effect";

const selectAllDownUnsafe = (Input: Client["Input"]) =>
  Input.dispatchKeyEvent({
    type: "keyDown",
    modifiers: 4,
    key: "a",
    code: "KeyA",
    windowsVirtualKeyCode: 65,
    commands: ["selectAll"],
  });

const selectAllUpUnsafe = (Input: Client["Input"]) =>
  Input.dispatchKeyEvent({
    type: "keyUp",
    modifiers: 4,
    key: "a",
    code: "KeyA",
    windowsVirtualKeyCode: 65,
  });

const insertTextUnsafe = (Input: Client["Input"], text: string) =>
  Input.insertText({ text });

const enterDownUnsafe = (Input: Client["Input"]) =>
  Input.dispatchKeyEvent({
    type: "keyDown",
    key: "Enter",
    code: "Enter",
    windowsVirtualKeyCode: 13,
  });

const enterUpUnsafe = (Input: Client["Input"]) =>
  Input.dispatchKeyEvent({
    type: "keyUp",
    key: "Enter",
    code: "Enter",
    windowsVirtualKeyCode: 13,
  });

const runInputCommand = (command: () => PromiseLike<unknown>) =>
  Effect.tryPromise({
    try: () => command(),
    catch: (cause) =>
      new XToolError({
        message: "Unable to send xTool keyboard input.",
        cause,
      }),
  });

const pressEnter = Effect.fn("flatmaxx.xtool.cdpTypeIn.enter")(function* (
  Input: Client["Input"],
) {
  yield* runInputCommand(() => enterDownUnsafe(Input));
  yield* runInputCommand(() => enterUpUnsafe(Input));
});

export const cdpTypeIn = Effect.fn("flatmaxx.xtool.cdpTypeIn")(function* (
  text: string,
  Input: Client["Input"],
  pressEnterWhenDone: boolean = false,
) {
  yield* runInputCommand(() => selectAllDownUnsafe(Input));
  yield* runInputCommand(() => selectAllUpUnsafe(Input));
  yield* runInputCommand(() => insertTextUnsafe(Input, text));
  yield* pressEnter(Input).pipe(
    Effect.when(Effect.succeed(pressEnterWhenDone)),
  );
});
