import { Effect } from "effect";
import { runMakeracamStage } from "./runMakeracamStage";
import type { MakeracamStepOptions } from "./types";

export const runFinalCut = Effect.fn("flatmaxx.makeracam.runFinalCut")(
  function* (
    pcbName: string,
    edgeCutGerberPath: string,
    contourMillDiameter: number,
    options: MakeracamStepOptions,
  ) {
    return yield* runMakeracamStage(
      {
        skipped: "MakeraCAM final cut",
        running: "MakeraCAM: final NPTH + edge cut",
      },
      pcbName,
      edgeCutGerberPath,
      contourMillDiameter,
      options,
    );
  },
);
