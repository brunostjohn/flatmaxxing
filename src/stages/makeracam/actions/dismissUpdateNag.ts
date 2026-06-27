import { clickElement, elementExists } from "@/macos";
import { Effect, Option } from "effect";
import { SETTLE } from "../constants";

const CLOSE_CANDIDATES = [
  { role: "AXButton", title: "Close" },
  { role: "AXButton", title: "OK" },
  { role: "AXButton", title: "Ok" },
  { role: "AXButton", title: "Got it" },
  { role: "AXButton", title: "Skip" },
] as const;

export const dismissUpdateNag = Effect.fn(
  "flatmaxx.makeracam.dismissUpdateNag",
)(function* (pid: number) {
  const nagPresent =
    (yield* elementExists(pid, { title: "Tips" })) ||
    (yield* elementExists(pid, { title: "Update" }));
  if (!nagPresent) return;

  const candidate = yield* Effect.findFirst(CLOSE_CANDIDATES, (query) =>
    elementExists(pid, query),
  );
  if (Option.isNone(candidate)) return;

  yield* clickElement(pid, candidate.value);
  yield* Effect.sleep(SETTLE);
});
