import { BoardValidationError } from "@/errors";
import { checkPlatingBathFit } from "@/stages/electroplating/calculateElectroplating";
import { resolvePlatingLayout } from "@/stages/generateEdgeCutDxfs/platingOutline";
import { findEdgeCutsBounds } from "@/stages/kicad/board/kicadBoardBounds";
import type { BoardValidator } from "@/stages/kicad/validation/boardValidationTypes";
import { Effect } from "effect";

export const ensureElectroplatingBathFit: BoardValidator = (context) =>
  Effect.sync(() => {
    const options = context.platingBath;
    if (
      options === undefined ||
      options.maxBoardWidthMm === undefined ||
      options.maxBoardHeightMm === undefined
    ) {
      return null;
    }

    const layout = resolvePlatingLayout(findEdgeCutsBounds(context.pcb), {
      offsets: options.platingOffsets,
      includeAlignmentDrills: options.includeAlignmentDrills,
      alignmentDistance: options.alignmentDistance,
    });
    const fit = checkPlatingBathFit(layout, options.platingOffsets, {
      waterMl: 1,
      maxBoardWidthMm: options.maxBoardWidthMm,
      maxBoardHeightMm: options.maxBoardHeightMm,
      allowRotation: options.allowRotation,
    });

    if (!fit.fits) {
      throw new BoardValidationError({ message: fit.message });
    }

    return null;
  });
