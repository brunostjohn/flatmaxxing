import { Match } from "effect";
import type { ToolpathKind } from "../types";

export const toolpathLabel = (kind: ToolpathKind) =>
  Match.value(kind).pipe(
    Match.when("drill", () => "2D Drilling"),
    Match.when("pocket", () => "2D Pocket"),
    Match.orElse(() => "2D Contour"),
  );
