import type {
  ElectroplatingContainerOptions,
  ElectroplatingOffsets,
  ElectroplatingRecipeOptions,
} from "@/config";
import type { PlatingLayout } from "@/stages/generateEdgeCutDxfs/platingOutline";

export type PlatingBathOrientation = "normal" | "rotated";

export interface PlatingBathFitResult {
  readonly configured: boolean;
  readonly fits: boolean;
  readonly orientation?: PlatingBathOrientation | undefined;
  readonly message: string;
  readonly suggestions: readonly string[];
}

export interface ElectroplatingValues {
  readonly areaCm2: number;
  readonly currentMa: number;
  readonly currentA: number;
  readonly waterLiters: number;
  readonly copperSulfatePentahydrateGrams: number;
  readonly citricAcidGrams: number;
  readonly polysorbate20Milliliters: number;
  readonly hclMilliliters: number;
  readonly bathFit: PlatingBathFitResult;
}

export interface ElectroplatingCalculationInput {
  readonly layout: PlatingLayout;
  readonly offsets: ElectroplatingOffsets;
  readonly container: ElectroplatingContainerOptions;
  readonly recipe: ElectroplatingRecipeOptions;
}

export type RequiredContainerBounds = Required<
  Pick<
    ElectroplatingContainerOptions,
    "allowRotation" | "maxBoardHeightMm" | "maxBoardWidthMm"
  >
>;

export interface OffsetPair {
  readonly first: number;
  readonly second: number;
}

export interface OffsetSuggestion {
  readonly orientation: PlatingBathOrientation;
  readonly totalExcess: number;
  readonly suggestions: readonly string[];
}

export interface ElectroplatingReportOptions {
  readonly enabled: boolean;
  readonly platingOffsets: ElectroplatingOffsets;
  readonly includeAlignmentDrills: boolean;
  readonly alignmentDistance: { readonly x: number; readonly y: number };
  readonly container: ElectroplatingContainerOptions;
  readonly recipe: ElectroplatingRecipeOptions;
  readonly projectDir: string;
}
