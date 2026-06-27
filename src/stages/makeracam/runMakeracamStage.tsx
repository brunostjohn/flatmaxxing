import { createTasklist, nextStep } from "@/inkHelpers";
import { Effect } from "effect";
import { orchestrateMakeracamStep } from "./orchestrateMakeracamStep";
import type { MakeracamStepOptions } from "./types";

export interface MakeracamStageLabels {
  readonly skipped: string;
  readonly running: string;
}

const renderSkipped = Effect.fn("flatmaxx.makeracam.renderSkipped")(function* (
  label: string,
  status: string,
) {
  const tasks = yield* createTasklist(
    [{ id: "stage", label, state: "pending" }],
    undefined,
  );
  yield* tasks.patchTask("stage", { state: "success", status });
}, Effect.scoped);

export const runMakeracamStage = Effect.fn("flatmaxx.makeracam.runStage")(
  function* (
    labels: MakeracamStageLabels,
    pcbName: string,
    edgeCutGerberPath: string,
    contourMillDiameter: number,
    options: MakeracamStepOptions,
  ) {
    if (!options.enabled) {
      yield* renderSkipped(labels.skipped, "Disabled in config — skipping.");
      return;
    }

    const title = `Step ${nextStep()}: ${labels.running}`;
    return yield* orchestrateMakeracamStep(
      options,
      pcbName,
      edgeCutGerberPath,
      contourMillDiameter,
      title,
    );
  },
);
