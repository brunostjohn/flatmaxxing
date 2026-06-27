import { clickElement, waitForElement, waitForGone } from "@/macos";
import { Duration, Effect } from "effect";
import { SETTLE } from "../constants";
import { selectToolRow } from "../helpers";
import { magazineCategoryFor } from "../selectStepDrills";

export const chooseToolByDiameter = Effect.fn(
  "flatmaxx.makeracam.chooseToolByDiameter",
)(function* (
  pid: number,
  method: string,
  diaMm: number,
  opener: "Choose Tool" | "Add Tool",
) {
  yield* clickElement(pid, { role: "AXButton", title: opener });

  yield* waitForElement(
    pid,
    { title: "Tool Magazine" },
    { timeout: Duration.seconds(15) },
  );

  const category = magazineCategoryFor(method);
  yield* clickElement(pid, { title: category, underTitle: "Tool Magazine" });
  yield* Effect.sleep(SETTLE);

  yield* selectToolRow(pid, diaMm, category);
  yield* Effect.sleep(SETTLE);

  yield* clickElement(pid, { role: "AXButton", title: "Choose" });
  yield* waitForGone(
    pid,
    { title: "Tool Magazine" },
    { timeout: Duration.seconds(10) },
  );
  yield* Effect.sleep(SETTLE);
});
