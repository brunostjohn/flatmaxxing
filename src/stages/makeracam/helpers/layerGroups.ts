import { axFind } from "@/macos";
import { Effect } from "effect";

export const layerGroupTitles = Effect.fnUntraced(function* (pid: number) {
  const groups = yield* axFind(pid, { role: "AXGroup" });
  return groups.flatMap((group) => group.titles);
});
