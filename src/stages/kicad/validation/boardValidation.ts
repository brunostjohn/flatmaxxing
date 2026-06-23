import type {
  BoardFix,
  BoardValidationContext,
  BoardValidator,
} from "@/stages/kicad/validation/boardValidationTypes";
import { ensureKicadHasAValidOrigin } from "@/stages/kicad/validation/ensureKicadHasAValidOrigin";
import { ensureManufacturableLayerCount } from "@/stages/kicad/validation/ensureManufacturableLayerCount";
import { Effect, Fiber } from "effect";
import type { KicadPcb } from "kicadts";

export {
  BoardValidationError,
  type BoardFix,
  type BoardValidationContext,
  type BoardValidator,
} from "@/stages/kicad/validation/boardValidationTypes";

const boardValidators = [
  ensureManufacturableLayerCount,
  ensureKicadHasAValidOrigin,
] satisfies ReadonlyArray<BoardValidator>;

export const validateBoard = Effect.fn("flatmaxx.validateBoard")(function* (
  context: BoardValidationContext,
) {
  return yield* validateBoardWithValidators(context, boardValidators);
});

export const validateBoardWithValidators = Effect.fn(
  "flatmaxx.validateBoardWithValidators",
)(function* (
  context: BoardValidationContext,
  validators: ReadonlyArray<BoardValidator>,
) {
  const fibers = yield* Effect.all(
    validators.map((validator) => validator(context).pipe(Effect.forkChild)),
  );
  const results = yield* Effect.all(fibers.map(Fiber.join));
  const fixes = results.flatMap((result) => result ?? []);

  return fixes.length === 0 ? null : fixes;
});

export const applyBoardFixes = Effect.fn("flatmaxx.applyBoardFixes")(function* (
  pcb: KicadPcb,
  fixes: ReadonlyArray<BoardFix>,
) {
  if (fixes.length === 0) {
    return false;
  }

  yield* Effect.sync(() => {
    for (const fix of fixes) {
      fix.apply(pcb);
    }
  });

  return true;
});
