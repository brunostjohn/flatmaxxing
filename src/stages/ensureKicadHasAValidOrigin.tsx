import { renderOnce } from "@/inkHelpers";
import { Alert } from "@inkjs/ui";
import { Effect, Match } from "effect";
import { FileSystem } from "effect/FileSystem";
import { parseKicadPcb } from "kicadts";

export const ensureKicadHasAValidOrigin = Effect.fn(
  "flatmaxx.ensureKicadHasAValidOrigin",
)(function* (projectFilePath: string) {
  const fs = yield* FileSystem;

  const pcbFile = yield* fs.readFileString(projectFilePath);
  const pcb = yield* Effect.sync(() => parseKicadPcb(pcbFile));

  const drillPlaceFileOrigin = pcb.setup?.auxAxisOrigin;
  const gridOrigin = pcb.setup?.gridOrigin;

  const hasDrillPlaceFileOrigin = drillPlaceFileOrigin !== undefined;
  const hasGridOrigin = gridOrigin !== undefined;

  const alertText = Match.value({
    hasDrillPlaceFileOrigin,
    hasGridOrigin,
  }).pipe(
    Match.when(
      { hasDrillPlaceFileOrigin: true, hasGridOrigin: false },
      () =>
        "The drill place file origin is set, but the grid origin is not set.",
    ),
    Match.when(
      { hasDrillPlaceFileOrigin: false, hasGridOrigin: true },
      () =>
        "The grid origin is set, but the drill place file origin is not set.",
    ),
    Match.when(
      { hasDrillPlaceFileOrigin: false, hasGridOrigin: false },
      () => "The drill place file origin and the grid origin are not set.",
    ),
    Match.when(
      { hasDrillPlaceFileOrigin: true, hasGridOrigin: true },
      () => null,
    ),
    Match.exhaustive,
  );

  if (!alertText) {
    return;
  }

  yield* renderOnce(<Alert variant="error">{alertText}</Alert>);

  yield* Effect.die(new Error(alertText));
});
