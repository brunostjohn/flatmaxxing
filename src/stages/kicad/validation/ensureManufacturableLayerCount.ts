import { BoardValidationError } from "@/errors";
import type { BoardValidator } from "@/stages/kicad/validation/boardValidationTypes";
import { Array, Effect } from "effect";

export const ensureManufacturableLayerCount: BoardValidator = (context) =>
  Effect.gen(function* () {
    const copperLayers = Array.filter(
      context.pcb.layers?.definitions ?? [],
      (layer) => (layer.name ?? "").endsWith(".Cu"),
    );

    if (copperLayers.length === 1 || copperLayers.length === 2) {
      return null;
    }

    return yield* Effect.fail(
      new BoardValidationError({
        message: `Board stackup has ${copperLayers.length} copper layers (${copperLayers
          .map((layer) => layer.name)
          .join(", ")}). flatmaxx can only manufacture 1- or 2-layer boards.`,
      }),
    );
  });
