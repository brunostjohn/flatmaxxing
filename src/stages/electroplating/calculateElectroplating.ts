import type { ElectroplatingOffsets } from "@/config";
import {
  dimensionsOfPlatingBounds,
  type PlatingLayout,
} from "@/stages/generateEdgeCutDxfs/platingOutline";
import { Array, Option, Order, pipe } from "effect";
import {
  DEFAULT_DECIMALS,
  DIMENSION_EPSILON_MM,
  MA_PER_A,
  ML_PER_LITER,
  MM_PER_CM,
  NEGATIVE_ZERO,
  PLATING_SIDES,
  TRAILING_ZEROS,
} from "./constants";
import type {
  ElectroplatingCalculationInput,
  ElectroplatingValues,
  OffsetPair,
  OffsetSuggestion,
  PlatingBathFitResult,
  PlatingBathOrientation,
  RequiredContainerBounds,
} from "./types";

const fitsWithin = (
  widthMm: number,
  heightMm: number,
  maxWidthMm: number,
  maxHeightMm: number,
) =>
  widthMm <= maxWidthMm + DIMENSION_EPSILON_MM &&
  heightMm <= maxHeightMm + DIMENSION_EPSILON_MM;

export const formatPlatingNumber = (
  value: number,
  maxDecimals = DEFAULT_DECIMALS,
) =>
  value
    .toFixed(maxDecimals)
    .replace(TRAILING_ZEROS, "")
    .replace(NEGATIVE_ZERO, "0");

const reduceOffsetPair = (
  first: number,
  second: number,
  maxTotal: number,
): OffsetPair => {
  const excess = Math.max(0, first + second - maxTotal);
  const order: readonly ("first" | "second")[] =
    first >= second ? ["first", "second"] : ["second", "first"];

  const [, reduced] = Array.mapAccum(
    order,
    { remaining: excess, pair: { first, second } },
    (acc, key) => {
      const value = acc.pair[key];
      const reduction = Math.min(value, Math.max(0, acc.remaining));
      const pair: OffsetPair = { ...acc.pair, [key]: value - reduction };
      return [{ remaining: acc.remaining - reduction, pair }, pair];
    },
  );

  return Array.last(reduced).pipe(Option.getOrElse(() => ({ first, second })));
};

const offsetSuggestionForTarget = (
  layout: PlatingLayout,
  offsets: ElectroplatingOffsets,
  targetWidthMm: number,
  targetHeightMm: number,
  orientation: PlatingBathOrientation,
): Option.Option<OffsetSuggestion> => {
  const base = dimensionsOfPlatingBounds(layout.baseBounds);
  if (!fitsWithin(base.widthMm, base.heightMm, targetWidthMm, targetHeightMm)) {
    return Option.none();
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

  return Option.some({
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
  });
};

const excessOrder = Order.mapInput(
  Order.Number,
  (suggestion: OffsetSuggestion) => suggestion.totalExcess,
);

const rotatedSuggestion = (
  layout: PlatingLayout,
  offsets: ElectroplatingOffsets,
  container: RequiredContainerBounds,
): Option.Option<OffsetSuggestion> =>
  container.allowRotation
    ? offsetSuggestionForTarget(
        layout,
        offsets,
        container.maxBoardHeightMm,
        container.maxBoardWidthMm,
        "rotated",
      )
    : Option.none();

const bathFitSuggestions = (
  layout: PlatingLayout,
  offsets: ElectroplatingOffsets,
  container: RequiredContainerBounds,
): readonly string[] =>
  pipe(
    Array.getSomes([
      offsetSuggestionForTarget(
        layout,
        offsets,
        container.maxBoardWidthMm,
        container.maxBoardHeightMm,
        "normal",
      ),
      rotatedSuggestion(layout, offsets, container),
    ]),
    Array.sort(excessOrder),
    Array.head,
    Option.match({
      onNone: () => [],
      onSome: (best) => best.suggestions,
    }),
  );

const notConfiguredResult = (): PlatingBathFitResult => ({
  configured: false,
  fits: true,
  message: "Bath fit was not checked; no max board size is configured.",
  suggestions: [],
});

const fitResult = (
  orientation: PlatingBathOrientation,
  maxBoardWidthMm: number,
  maxBoardHeightMm: number,
): PlatingBathFitResult => ({
  configured: true,
  fits: true,
  orientation,
  message:
    orientation === "normal"
      ? `Fits ${formatPlatingNumber(maxBoardWidthMm)}mm x ${formatPlatingNumber(
          maxBoardHeightMm,
        )}mm bath in normal orientation.`
      : `Fits ${formatPlatingNumber(maxBoardWidthMm)}mm x ${formatPlatingNumber(
          maxBoardHeightMm,
        )}mm bath when rotated 90 degrees.`,
  suggestions: [],
});

const noFitResult = (
  layout: PlatingLayout,
  maxBoardWidthMm: number,
  maxBoardHeightMm: number,
  suggestions: readonly string[],
): PlatingBathFitResult => {
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

export const checkPlatingBathFit = (
  layout: PlatingLayout,
  offsets: ElectroplatingOffsets,
  container: ElectroplatingCalculationInput["container"],
): PlatingBathFitResult => {
  const { maxBoardWidthMm, maxBoardHeightMm } = container;
  if (maxBoardWidthMm === undefined || maxBoardHeightMm === undefined) {
    return notConfiguredResult();
  }

  if (
    fitsWithin(
      layout.widthMm,
      layout.heightMm,
      maxBoardWidthMm,
      maxBoardHeightMm,
    )
  ) {
    return fitResult("normal", maxBoardWidthMm, maxBoardHeightMm);
  }

  if (
    container.allowRotation &&
    fitsWithin(
      layout.heightMm,
      layout.widthMm,
      maxBoardWidthMm,
      maxBoardHeightMm,
    )
  ) {
    return fitResult("rotated", maxBoardWidthMm, maxBoardHeightMm);
  }

  const suggestions = bathFitSuggestions(layout, offsets, {
    allowRotation: container.allowRotation,
    maxBoardWidthMm,
    maxBoardHeightMm,
  });
  return noFitResult(layout, maxBoardWidthMm, maxBoardHeightMm, suggestions);
};

export const calculateElectroplatingValues = ({
  layout,
  offsets,
  container,
  recipe,
}: ElectroplatingCalculationInput): ElectroplatingValues => {
  const waterLiters = container.waterMl / ML_PER_LITER;
  const areaCm2 =
    (layout.widthMm / MM_PER_CM) *
    (layout.heightMm / MM_PER_CM) *
    PLATING_SIDES;
  const currentMa = areaCm2 * recipe.currentDensityMaPerCm2;

  return {
    areaCm2,
    currentMa,
    currentA: currentMa / MA_PER_A,
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
