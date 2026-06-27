import { ElectroplatingError } from "@/errors";
import { createTasklist, nextStep, type TaskDef } from "@/inkHelpers";
import { findEdgeCutsBounds } from "@/stages/kicad/board/kicadBoardBounds";
import {
  resolvePlatingLayout,
  type PlatingLayout,
} from "@/stages/generateEdgeCutDxfs/platingOutline";
import { Array, Effect, FileSystem, Path, pipe } from "effect";
import { type KicadPcb, parseKicadPcb } from "kicadts";
import {
  calculateElectroplatingValues,
  formatPlatingNumber,
} from "./calculateElectroplating";
import { CURRENT_DECIMALS, PCB_SUFFIX, PLATING_REPORT_FILE } from "./constants";
import type {
  ElectroplatingReportOptions,
  ElectroplatingValues,
} from "./types";

export type { ElectroplatingReportOptions } from "./types";

const parsePcb = (source: string) =>
  Effect.try({
    try: () => parseKicadPcb(source),
    catch: (cause) =>
      new ElectroplatingError({
        message: "Could not parse the PCB file.",
        cause,
      }),
  });

const buildLayout = (pcb: KicadPcb, options: ElectroplatingReportOptions) =>
  Effect.try({
    try: () =>
      resolvePlatingLayout(findEdgeCutsBounds(pcb), {
        offsets: options.platingOffsets,
        includeAlignmentDrills: options.includeAlignmentDrills,
        alignmentDistance: options.alignmentDistance,
      }),
    catch: (cause) =>
      new ElectroplatingError({
        message: "Could not resolve the plating layout.",
        cause,
      }),
  });

const buildValues = (
  layout: PlatingLayout,
  options: ElectroplatingReportOptions,
) =>
  Effect.try({
    try: () =>
      calculateElectroplatingValues({
        layout,
        offsets: options.platingOffsets,
        container: options.container,
        recipe: options.recipe,
      }),
    catch: (cause) =>
      new ElectroplatingError({
        message: "Could not calculate electroplating values.",
        cause,
      }),
  });

const platingOutlineSection = (
  layout: PlatingLayout,
  values: ElectroplatingValues,
): readonly string[] => [
  "Plating outline",
  `- Bounding size: ${formatPlatingNumber(layout.widthMm)}mm x ${formatPlatingNumber(
    layout.heightMm,
  )}mm`,
  `- Surface area: ${formatPlatingNumber(values.areaCm2)}cm2 (bounding box x 2 sides)`,
  `- Bath fit: ${values.bathFit.message}`,
  "",
];

const electricalSection = (
  values: ElectroplatingValues,
  recipe: ElectroplatingReportOptions["recipe"],
): readonly string[] => [
  "Electrical",
  `- Current density: ${formatPlatingNumber(recipe.currentDensityMaPerCm2)} mA/cm2`,
  `- Current limit: ${formatPlatingNumber(
    values.currentMa,
    CURRENT_DECIMALS,
  )} mA (${formatPlatingNumber(values.currentA)} A)`,
  `- Voltage limit: ${formatPlatingNumber(recipe.voltageLimitV)}V`,
  `- Time: ${formatPlatingNumber(recipe.durationMinutes)}min`,
  `- Stirrer: ${formatPlatingNumber(recipe.stirRpm)}rpm`,
  `- Target copper: ${formatPlatingNumber(recipe.targetCopperMicrons)} microns`,
  "",
];

const solutionSection = (
  values: ElectroplatingValues,
  container: ElectroplatingReportOptions["container"],
  recipe: ElectroplatingReportOptions["recipe"],
): readonly string[] => [
  "Solution",
  `- Water: ${formatPlatingNumber(container.waterMl)}mL`,
  `- Copper sulfate pentahydrate: ${formatPlatingNumber(
    values.copperSulfatePentahydrateGrams,
  )}g`,
  `- Citric acid: ${formatPlatingNumber(values.citricAcidGrams)}g`,
  `- Polysorbate 20: ${formatPlatingNumber(values.polysorbate20Milliliters)}mL`,
  `- HCl (${formatPlatingNumber(
    recipe.hcl.solutionConcentrationPercent,
  )}% solution): ${formatPlatingNumber(values.hclMilliliters)}mL`,
  "",
];

export const renderElectroplatingReport = (
  boardName: string,
  layout: PlatingLayout,
  values: ElectroplatingValues,
  options: Pick<ElectroplatingReportOptions, "container" | "recipe">,
) =>
  pipe(
    [
      `Electroplating report for ${boardName}`,
      "",
      ...platingOutlineSection(layout, values),
      ...electricalSection(values, options.recipe),
      ...solutionSection(values, options.container, options.recipe),
    ],
    Array.join("\n"),
  );

const reportTasks: TaskDef[] = [
  { id: "read", label: "Reading the PCB...", state: "loading" },
  {
    id: "calculate",
    label: "Calculating electroplating values...",
    state: "pending",
  },
  { id: "write", label: "Writing PLATING.txt...", state: "pending" },
];

export const generateElectroplatingReport = Effect.fn(
  "flatmaxx.generateElectroplatingReport",
)(function* (pcbFile: string, options: ElectroplatingReportOptions) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  const title = options.enabled
    ? `Step ${nextStep()}: Electroplating values`
    : "Electroplating values (skipped)";
  const controls = yield* createTasklist(reportTasks, title);
  const { patchTask } = controls;

  if (!options.enabled) {
    yield* patchTask("read", {
      state: "success",
      label: "Electroplating values disabled — skipping.",
    });
    yield* patchTask("calculate", {
      state: "success",
      label: "Nothing to calculate.",
    });
    yield* patchTask("write", {
      state: "success",
      label: "No file written.",
    });
    return;
  }

  const boardName = path.basename(pcbFile, PCB_SUFFIX);

  const source = yield* fs.readFileString(pcbFile).pipe(
    Effect.mapError(
      (cause) =>
        new ElectroplatingError({
          message: "Could not read the PCB file.",
          cause,
        }),
    ),
    Effect.tapError(() => patchTask("read", { state: "error" })),
  );
  const pcb = yield* parsePcb(source).pipe(
    Effect.tapError(() => patchTask("read", { state: "error" })),
  );
  yield* patchTask("read", {
    state: "success",
    label: `Read ${boardName}${PCB_SUFFIX}.`,
  });
  yield* patchTask("calculate", { state: "loading" });

  const layout = yield* buildLayout(pcb, options).pipe(
    Effect.tapError(() => patchTask("calculate", { state: "error" })),
  );
  const values = yield* buildValues(layout, options).pipe(
    Effect.tapError(() => patchTask("calculate", { state: "error" })),
  );
  const report = renderElectroplatingReport(boardName, layout, values, options);
  yield* patchTask("calculate", {
    state: "success",
    label: `Current limit ${formatPlatingNumber(
      values.currentMa,
      CURRENT_DECIMALS,
    )} mA (${formatPlatingNumber(values.currentA)} A).`,
  });
  yield* patchTask("write", { state: "loading" });

  yield* fs.makeDirectory(options.gerbersDir, { recursive: true });
  const reportPath = path.join(options.gerbersDir, PLATING_REPORT_FILE);
  yield* fs.writeFileString(reportPath, report).pipe(
    Effect.mapError(
      (cause) =>
        new ElectroplatingError({
          message: "Could not write PLATING.txt.",
          cause,
        }),
    ),
    Effect.tapError(() => patchTask("write", { state: "error" })),
  );

  yield* patchTask("write", {
    state: "success",
    label: `Wrote ${PLATING_REPORT_FILE}.`,
  });
}, Effect.scoped);
