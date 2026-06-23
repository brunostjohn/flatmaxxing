import type {
  ElectroplatingContainerOptions,
  ElectroplatingOffsets,
  ElectroplatingRecipeOptions,
} from "@/config";
import {
  dimensionsOfPlatingBounds,
  type PlatingLayout,
} from "@/stages/generateEdgeCutDxfs/platingOutline";

export type PlatingBathOrientation = "normal" | "rotated";

export type PlatingBathFitResult = {
  readonly configured: boolean;
  readonly fits: boolean;
  readonly orientation?: PlatingBathOrientation | undefined;
  readonly message: string;
  readonly suggestions: readonly string[];
};

export type ElectroplatingValues = {
  readonly areaCm2: number;
  readonly currentMa: number;
  readonly currentA: number;
  readonly waterLiters: number;
  readonly copperSulfatePentahydrateGrams: number;
  readonly citricAcidGrams: number;
  readonly polysorbate20Milliliters: number;
  readonly hclMilliliters: number;
  readonly bathFit: PlatingBathFitResult;
};

export type ElectroplatingCalculationInput = {
  readonly layout: PlatingLayout;
  readonly offsets: ElectroplatingOffsets;
  readonly container: ElectroplatingContainerOptions;
  readonly recipe: ElectroplatingRecipeOptions;
};

const DIMENSION_EPSILON_MM = 1e-9;

const fitsWithin = (
  widthMm: number,
  heightMm: number,
  maxWidthMm: number,
  maxHeightMm: number,
) =>
  widthMm <= maxWidthMm + DIMENSION_EPSILON_MM &&
  heightMm <= maxHeightMm + DIMENSION_EPSILON_MM;

export const formatPlatingNumber = (value: number, maxDecimals = 3) =>
  value
    .toFixed(maxDecimals)
    .replace(/\.?0+$/, "")
    .replace(/^-0$/, "0");

const reduceOffsetPair = (first: number, second: number, maxTotal: number) => {
  const next = { first, second };
  let excess = Math.max(0, first + second - maxTotal);
  const order =
    first >= second
      ? (["first", "second"] as const)
      : (["second", "first"] as const);

  for (const key of order) {
    if (excess <= DIMENSION_EPSILON_MM) break;
    const reduction = Math.min(next[key], excess);
    next[key] -= reduction;
    excess -= reduction;
  }

  return next;
};

const offsetSuggestionForTarget = (
  layout: PlatingLayout,
  offsets: ElectroplatingOffsets,
  targetWidthMm: number,
  targetHeightMm: number,
  orientation: PlatingBathOrientation,
) => {
  const base = dimensionsOfPlatingBounds(layout.baseBounds);
  if (!fitsWithin(base.widthMm, base.heightMm, targetWidthMm, targetHeightMm)) {
    return undefined;
  }

  const maxHorizontalOffsets = targetWidthMm - base.widthMm;
  const maxVerticalOffsets = targetHeightMm - base.heightMm;
  const horizontalExcess = Math.max(
    0,
    offsets.left + offsets.right - maxHorizontalOffsets,
  );
  const verticalExcess = Math.max(
    0,
    offsets.top + offsets.bottom - maxVerticalOffsets,
  );
  const horizontal = reduceOffsetPair(
    offsets.left,
    offsets.right,
    maxHorizontalOffsets,
  );
  const vertical = reduceOffsetPair(
    offsets.top,
    offsets.bottom,
    maxVerticalOffsets,
  );

  return {
    orientation,
    totalExcess: horizontalExcess + verticalExcess,
    suggestions: [
      `For ${orientation} fit, keep left+right <= ${formatPlatingNumber(
        maxHorizontalOffsets,
      )}mm and top+bottom <= ${formatPlatingNumber(maxVerticalOffsets)}mm.`,
      `One possible electroplating.additionalDistance is left=${formatPlatingNumber(
        horizontal.first,
      )}, right=${formatPlatingNumber(horizontal.second)}, top=${formatPlatingNumber(
        vertical.first,
      )}, bottom=${formatPlatingNumber(vertical.second)}.`,
    ],
  };
};

const bathFitSuggestions = (
  layout: PlatingLayout,
  offsets: ElectroplatingOffsets,
  container: Required<
    Pick<
      ElectroplatingContainerOptions,
      "allowRotation" | "maxBoardHeightMm" | "maxBoardWidthMm"
    >
  >,
) => {
  const candidates = [
    offsetSuggestionForTarget(
      layout,
      offsets,
      container.maxBoardWidthMm,
      container.maxBoardHeightMm,
      "normal",
    ),
    container.allowRotation
      ? offsetSuggestionForTarget(
          layout,
          offsets,
          container.maxBoardHeightMm,
          container.maxBoardWidthMm,
          "rotated",
        )
      : undefined,
  ].filter((candidate) => candidate !== undefined);

  candidates.sort((a, b) => a.totalExcess - b.totalExcess);
  return candidates[0]?.suggestions ?? [];
};

export const checkPlatingBathFit = (
  layout: PlatingLayout,
  offsets: ElectroplatingOffsets,
  container: ElectroplatingContainerOptions,
): PlatingBathFitResult => {
  const { maxBoardWidthMm, maxBoardHeightMm } = container;
  if (maxBoardWidthMm === undefined || maxBoardHeightMm === undefined) {
    return {
      configured: false,
      fits: true,
      message: "Bath fit was not checked; no max board size is configured.",
      suggestions: [],
    };
  }

  const normalFits = fitsWithin(
    layout.widthMm,
    layout.heightMm,
    maxBoardWidthMm,
    maxBoardHeightMm,
  );
  if (normalFits) {
    return {
      configured: true,
      fits: true,
      orientation: "normal",
      message: `Fits ${formatPlatingNumber(maxBoardWidthMm)}mm x ${formatPlatingNumber(
        maxBoardHeightMm,
      )}mm bath in normal orientation.`,
      suggestions: [],
    };
  }

  const rotatedFits =
    container.allowRotation &&
    fitsWithin(
      layout.heightMm,
      layout.widthMm,
      maxBoardWidthMm,
      maxBoardHeightMm,
    );
  if (rotatedFits) {
    return {
      configured: true,
      fits: true,
      orientation: "rotated",
      message: `Fits ${formatPlatingNumber(maxBoardWidthMm)}mm x ${formatPlatingNumber(
        maxBoardHeightMm,
      )}mm bath when rotated 90 degrees.`,
      suggestions: [],
    };
  }

  const suggestions = bathFitSuggestions(layout, offsets, {
    allowRotation: container.allowRotation,
    maxBoardWidthMm,
    maxBoardHeightMm,
  });
  const base = dimensionsOfPlatingBounds(layout.baseBounds);
  const suggestionText =
    suggestions.length > 0
      ? suggestions.join(" ")
      : `The board/alignment outline is ${formatPlatingNumber(
          base.widthMm,
        )}mm x ${formatPlatingNumber(
          base.heightMm,
        )}mm before offsets, so it cannot fit this bath even with zero additionalDistance.`;

  return {
    configured: true,
    fits: false,
    message: `Plating outline ${formatPlatingNumber(
      layout.widthMm,
    )}mm x ${formatPlatingNumber(
      layout.heightMm,
    )}mm does not fit ${formatPlatingNumber(maxBoardWidthMm)}mm x ${formatPlatingNumber(
      maxBoardHeightMm,
    )}mm bath. ${suggestionText}`,
    suggestions,
  };
};

export const calculateElectroplatingValues = ({
  layout,
  offsets,
  container,
  recipe,
}: ElectroplatingCalculationInput): ElectroplatingValues => {
  const waterLiters = container.waterMl / 1000;
  const areaCm2 = (layout.widthMm / 10) * (layout.heightMm / 10) * 2;
  const currentMa = areaCm2 * recipe.currentDensityMaPerCm2;

  return {
    areaCm2,
    currentMa,
    currentA: currentMa / 1000,
    waterLiters,
    copperSulfatePentahydrateGrams:
      recipe.copperSulfatePentahydrate.gramsPerLiter * waterLiters,
    citricAcidGrams: recipe.citricAcid.gramsPerLiter * waterLiters,
    polysorbate20Milliliters:
      recipe.polysorbate20.millilitersPerLiter * waterLiters,
    hclMilliliters:
      recipe.hcl.referenceMillilitersPerLiter *
      waterLiters *
      (recipe.hcl.referenceConcentrationPercent /
        recipe.hcl.solutionConcentrationPercent),
    bathFit: checkPlatingBathFit(layout, offsets, container),
  };
};
