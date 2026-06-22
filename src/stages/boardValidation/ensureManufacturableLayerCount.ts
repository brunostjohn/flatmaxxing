import type { BoardValidator } from "@/stages/boardValidation/boardValidationTypes";
import { BoardValidationError } from "@/stages/boardValidation/boardValidationTypes";
import { Effect } from "effect";

export const ensureManufacturableLayerCount: BoardValidator = (context) =>
  Effect.gen(function* () {
    const copperLayers =
      context.pcb.layers?.definitions.filter((layer) =>
        (layer.name ?? "").endsWith(".Cu"),
      ) ?? [];

    if (copperLayers.length === 1 || copperLayers.length === 2) {
      return null;
    }

    return yield* Effect.fail(
      new BoardValidationError(
        `Board stackup has ${copperLayers.length} copper layers (${copperLayers.map((layer) => layer.name).join(", ")}). flatmaxx can only manufacture 1- or 2-layer boards.`,
      ),
    );
  });
