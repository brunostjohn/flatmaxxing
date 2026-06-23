import type {
  ElectroplatingContainerOptions,
  ElectroplatingOffsets,
  ElectroplatingRecipeOptions,
} from "@/config";
import { renderWaiting } from "@/inkHelpers";
import { findEdgeCutsBounds } from "@/stages/kicad/board/kicadBoardBounds";
import {
  resolvePlatingLayout,
  type PlatingLayout,
} from "@/stages/generateEdgeCutDxfs/platingOutline";
import { Effect, FileSystem } from "effect";
import { parseKicadPcb } from "kicadts";
import { basename, join } from "node:path";
import {
  calculateElectroplatingValues,
  formatPlatingNumber,
  type ElectroplatingValues,
} from "./calculateElectroplating";

export interface ElectroplatingReportOptions {
  readonly enabled: boolean;
  readonly platingOffsets: ElectroplatingOffsets;
  readonly includeAlignmentDrills: boolean;
  readonly alignmentDistance: { readonly x: number; readonly y: number };
  readonly container: ElectroplatingContainerOptions;
  readonly recipe: ElectroplatingRecipeOptions;
  readonly gerbersDir: string;
}

export const renderElectroplatingReport = (
  boardName: string,
  layout: PlatingLayout,
  values: ElectroplatingValues,
  options: Pick<ElectroplatingReportOptions, "container" | "recipe">,
) => {
  const { container, recipe } = options;

  return [
    `Electroplating report for ${boardName}`,
    "",
    "Plating outline",
    `- Bounding size: ${formatPlatingNumber(layout.widthMm)}mm x ${formatPlatingNumber(
      layout.heightMm,
    )}mm`,
    `- Surface area: ${formatPlatingNumber(values.areaCm2)}cm2 (bounding box x 2 sides)`,
    `- Bath fit: ${values.bathFit.message}`,
    "",
    "Electrical",
    `- Current density: ${formatPlatingNumber(
      recipe.currentDensityMaPerCm2,
    )} mA/cm2`,
    `- Current limit: ${formatPlatingNumber(values.currentMa, 1)} mA (${formatPlatingNumber(
      values.currentA,
    )} A)`,
    `- Voltage limit: ${formatPlatingNumber(recipe.voltageLimitV)}V`,
    `- Time: ${formatPlatingNumber(recipe.durationMinutes)}min`,
    `- Stirrer: ${formatPlatingNumber(recipe.stirRpm)}rpm`,
    `- Target copper: ${formatPlatingNumber(recipe.targetCopperMicrons)} microns`,
    "",
    "Solution",
    `- Water: ${formatPlatingNumber(container.waterMl)}mL`,
    `- Copper sulfate pentahydrate: ${formatPlatingNumber(
      values.copperSulfatePentahydrateGrams,
    )}g`,
    `- Citric acid: ${formatPlatingNumber(values.citricAcidGrams)}g`,
    `- Polysorbate 20: ${formatPlatingNumber(
      values.polysorbate20Milliliters,
    )}mL`,
    `- HCl (${formatPlatingNumber(
      recipe.hcl.solutionConcentrationPercent,
    )}% solution): ${formatPlatingNumber(values.hclMilliliters)}mL`,
    "",
  ].join("\n");
};

export const generateElectroplatingReport = Effect.fn(
  "flatmaxx.generateElectroplatingReport",
)(function* (pcbFile: string, options: ElectroplatingReportOptions) {
  if (!options.enabled) {
    const [success] = yield* renderWaiting({
      loading: "Electroplating values...",
    });
    yield* success("Electroplating values disabled - skipping.");
    return;
  }

  const fs = yield* FileSystem.FileSystem;
  const boardName = basename(pcbFile, ".kicad_pcb");
  const [success, error] = yield* renderWaiting({
    loading: "Calculating electroplating values...",
  });

  const built = yield* fs.readFileString(pcbFile).pipe(
    Effect.tapError(() =>
      error("Electroplating values failed: could not read the PCB file."),
    ),
    Effect.flatMap((source) =>
      Effect.try({
        try: () => {
          const pcb = parseKicadPcb(source);
          const layout = resolvePlatingLayout(findEdgeCutsBounds(pcb), {
            offsets: options.platingOffsets,
            includeAlignmentDrills: options.includeAlignmentDrills,
            alignmentDistance: options.alignmentDistance,
          });
          const values = calculateElectroplatingValues({
            layout,
            offsets: options.platingOffsets,
            container: options.container,
            recipe: options.recipe,
          });

          return {
            layout,
            values,
            report: renderElectroplatingReport(
              boardName,
              layout,
              values,
              options,
            ),
          };
        },
        catch: (cause) =>
          cause instanceof Error ? cause : new Error(String(cause)),
      }),
    ),
    Effect.tapError((cause) =>
      error(`Electroplating values failed: ${cause.message}`),
    ),
  );

  yield* fs.makeDirectory(options.gerbersDir, { recursive: true });
  const reportPath = join(options.gerbersDir, "PLATING.txt");
  yield* fs
    .writeFileString(reportPath, built.report)
    .pipe(
      Effect.tapError(() =>
        error("Electroplating values failed: could not write PLATING.txt."),
      ),
    );

  yield* success(
    `Plating current: ${formatPlatingNumber(
      built.values.currentMa,
      1,
    )} mA (${formatPlatingNumber(built.values.currentA)} A). Wrote PLATING.txt.`,
  );
});
