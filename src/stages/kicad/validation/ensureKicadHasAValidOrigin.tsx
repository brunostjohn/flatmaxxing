import { BoardValidationError } from "@/errors";
import { getBottomLeftBoardOrigin } from "@/stages/kicad/board/kicadBoardBounds";
import type {
  BoardFix,
  BoardValidationContext,
} from "@/stages/kicad/validation/boardValidationTypes";
import { Effect } from "effect";
import { Setup, type KicadPcb } from "kicadts";

export const ensureKicadHasAValidOrigin = Effect.fn(
  "flatmaxx.ensureKicadHasAValidOrigin",
)(function* (context: BoardValidationContext) {
  const origin = yield* Effect.try({
    try: () => getBottomLeftBoardOrigin(context.pcb),
    catch: (cause) =>
      cause instanceof BoardValidationError
        ? cause
        : new BoardValidationError({
            message:
              "Unable to infer the KiCad board origin from Edge.Cuts geometry.",
            cause,
          }),
  });

  const drillPlaceFileOrigin = context.pcb.setup?.auxAxisOrigin;
  const gridOrigin = context.pcb.setup?.gridOrigin;

  if (
    coordinatesEqual(drillPlaceFileOrigin, origin) &&
    coordinatesEqual(gridOrigin, origin)
  ) {
    return null;
  }

  return [
    {
      id: "kicad-origin",
      message: `Set drill/place and grid origins to Edge.Cuts bottom-left (${formatCoordinate(origin)}).`,
      apply: (pcb: KicadPcb) => {
        pcb.setup ??= new Setup();
        pcb.setup.auxAxisOrigin = origin;
        pcb.setup.gridOrigin = origin;
      },
    },
  ] satisfies ReadonlyArray<BoardFix>;
});

const COORDINATE_EPSILON = 1e-9;

const coordinatesEqual = (
  current: { readonly x: number; readonly y: number } | undefined,
  expected: { readonly x: number; readonly y: number },
) =>
  current !== undefined &&
  Math.abs(current.x - expected.x) < COORDINATE_EPSILON &&
  Math.abs(current.y - expected.y) < COORDINATE_EPSILON;

const formatCoordinate = (coordinate: {
  readonly x: number;
  readonly y: number;
}) => `${formatNumber(coordinate.x)}, ${formatNumber(coordinate.y)}`;

const formatNumber = (value: number) => Number(value.toFixed(6)).toString();
