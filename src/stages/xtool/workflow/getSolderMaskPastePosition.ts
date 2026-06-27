import { Option } from "effect";
import type { SolderMaskBounds, SolderMaskPasteOffsets } from "./types";

export const getSolderMaskPastePosition = (
  { width, height }: SolderMaskBounds,
  { right, bottom }: SolderMaskPasteOffsets = {},
) => ({
  x: Option.fromUndefinedOr(right).pipe(
    Option.match({ onNone: () => 0, onSome: (value) => width + value }),
  ),
  y: Option.fromUndefinedOr(bottom).pipe(
    Option.match({ onNone: () => 0, onSome: (value) => height + value }),
  ),
});
