import { clickElement, elementExists, setElementValue } from "@/macos";
import { Effect } from "effect";
import { SETTLE } from "../constants";

export const setStockMaterialPCB = Effect.fn(
  "flatmaxx.makeracam.setStockMaterialPCB",
)(function* (pid: number) {
  yield* clickElement(pid, { role: "AXButton", title: "Edit" });
  yield* Effect.sleep(SETTLE);

  const hasMaterialPopup = yield* elementExists(pid, { role: "AXPopUpButton" });
  if (hasMaterialPopup) {
    yield* setElementValue(pid, { role: "AXPopUpButton" }, "PCB").pipe(
      Effect.catch(() =>
        Effect.gen(function* () {
          yield* clickElement(pid, { role: "AXPopUpButton" });
          yield* Effect.sleep(SETTLE);
          yield* clickElement(pid, { role: "AXMenuItem", title: "PCB" });
        }),
      ),
    );
  }

  yield* clickElement(pid, { role: "AXButton", title: "Ok" });
  yield* Effect.sleep(SETTLE);
});
