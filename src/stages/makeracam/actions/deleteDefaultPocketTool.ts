import { axFind, clickAt } from "@/macos";
import { Effect } from "effect";
import { SETTLE } from "../constants";

const SAME_ROW_TOLERANCE = 12;

export const deleteDefaultPocketTool = Effect.fn(
  "flatmaxx.makeracam.deleteDefaultPocketTool",
)(function* (pid: number) {
  const addTool = (yield* axFind(pid, {
    role: "AXButton",
    title: "Add Tool",
  }))[0];
  if (addTool === undefined) return;

  const toolListDelete = (yield* axFind(pid, {
    role: "AXButton",
    title: "Delete",
  })).find(
    (button) =>
      Math.abs(button.cy - addTool.cy) <= SAME_ROW_TOLERANCE &&
      button.cx > addTool.cx,
  );
  if (toolListDelete === undefined) return;

  yield* clickAt({ x: toolListDelete.cx, y: toolListDelete.cy });
  yield* Effect.sleep(SETTLE);
});
