import { axFind } from "@/macos";
import type { AxElementInfo } from "@flatmaxxing/accessibility";
import { Effect } from "effect";

export const isToolpathNode = (group: AxElementInfo) =>
  Object.values(group.titles).some((title) => /^\[T\d/.test(title));

export const toolpathNodes = Effect.fnUntraced(function* (pid: number) {
  return (yield* axFind(pid, { role: "AXGroup" }))
    .filter(isToolpathNode)
    .sort((a, b) => a.y - b.y);
});
