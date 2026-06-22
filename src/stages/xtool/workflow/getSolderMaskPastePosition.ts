import type { SolderMaskBounds, SolderMaskPasteOffsets } from "./types";

export function getSolderMaskPastePosition(
  { width, height }: SolderMaskBounds,
  { right, bottom }: SolderMaskPasteOffsets = {},
) {
  return {
    x: right === undefined ? 0 : width + right,
    y: bottom === undefined ? 0 : height + bottom,
  };
}
