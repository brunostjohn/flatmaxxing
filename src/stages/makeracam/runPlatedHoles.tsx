import { Effect } from "effect";
import { runMakeracamStage } from "./runMakeracamStage";
import type { MakeracamStepOptions } from "./types";

export const runPlatedHoles = Effect.fn("flatmaxx.makeracam.runPlatedHoles")(
  function* (
    pcbName: string,
    edgeCutGerberPath: string,
    contourMillDiameter: number,
    options: MakeracamStepOptions,
  ) {
    return yield* runMakeracamStage(
      {
        skipped: "MakeraCAM plated holes",
        running: "MakeraCAM: plated holes + PTH + edge cut",
      },
      pcbName,
      edgeCutGerberPath,
      contourMillDiameter,
      options,
    );
  },
);
