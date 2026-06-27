import { clickElement, elementExists } from "@/macos";
import { Effect } from "effect";
import { SETTLE } from "../constants";

export const deleteDefaultPocketTool = Effect.fn(
  "flatmaxx.makeracam.deleteDefaultPocketTool",
)(function* (pid: number) {
  const hasDelete = yield* elementExists(pid, {
    role: "AXButton",
    title: "Delete",
  });
  if (!hasDelete) return;
  yield* clickElement(pid, { role: "AXButton", title: "Delete" });
  yield* Effect.sleep(SETTLE);
});
