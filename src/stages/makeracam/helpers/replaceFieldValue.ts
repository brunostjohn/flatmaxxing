import { doubleClickAt, pressKeyCode, typeText } from "@/macos";
import { Duration, Effect } from "effect";
import { KEY_A, KEY_TAB, SETTLE } from "../constants";

export const replaceFieldValue = Effect.fnUntraced(function* (
  x: number,
  y: number,
  value: string,
  afterFocus: Duration.Duration,
) {
  yield* doubleClickAt({ x, y });
  yield* Effect.sleep(afterFocus);
  yield* pressKeyCode(KEY_A, ["command"]);
  yield* typeText(value);
  yield* pressKeyCode(KEY_TAB);
  yield* Effect.sleep(SETTLE);
});
