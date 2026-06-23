import {
  defaultElectroplatingContainer,
  defaultElectroplatingRecipe,
} from "@/config";
import { resolvePlatingLayout } from "@/stages/generateEdgeCutDxfs/platingOutline";
import { expect, test } from "bun:test";
import {
  calculateElectroplatingValues,
  checkPlatingBathFit,
} from "./calculateElectroplating";

const noOffsets = { left: 0, right: 0, top: 0, bottom: 0 };

const layoutFor = (widthMm: number, heightMm: number, offsets = noOffsets) =>
  resolvePlatingLayout(
    { minX: 0, minY: 0, maxX: widthMm, maxY: heightMm },
    {
      offsets,
      includeAlignmentDrills: false,
      alignmentDistance: { x: 6, y: 6 },
    },
  );

test("recipe example calculates current from bounding-box area on both sides", () => {
  const layout = layoutFor(50, 70);
  const values = calculateElectroplatingValues({
    layout,
    offsets: noOffsets,
    container: {
      ...defaultElectroplatingContainer,
      maxBoardWidthMm: 50,
      maxBoardHeightMm: 70,
    },
    recipe: defaultElectroplatingRecipe,
  });

  expect(values.areaCm2).toBeCloseTo(70);
  expect(values.currentMa).toBeCloseTo(1505);
  expect(values.currentA).toBeCloseTo(1.505);
});

test("recipe amounts scale from configured water volume", () => {
  const values = calculateElectroplatingValues({
    layout: layoutFor(50, 70),
    offsets: noOffsets,
    container: defaultElectroplatingContainer,
    recipe: defaultElectroplatingRecipe,
  });

  expect(values.copperSulfatePentahydrateGrams).toBeCloseTo(75);
  expect(values.citricAcidGrams).toBeCloseTo(57);
  expect(values.polysorbate20Milliliters).toBeCloseTo(3);
  expect(values.hclMilliliters).toBeCloseTo(0.3);
});

test("HCl amount adjusts for configured solution concentration", () => {
  const values = calculateElectroplatingValues({
    layout: layoutFor(50, 70),
    offsets: noOffsets,
    container: defaultElectroplatingContainer,
    recipe: {
      ...defaultElectroplatingRecipe,
      hcl: {
        ...defaultElectroplatingRecipe.hcl,
        solutionConcentrationPercent: 20,
      },
    },
  });

  expect(values.hclMilliliters).toBeCloseTo(0.1125);
});

test("bath fit accepts a 90 degree rotation when enabled", () => {
  const fit = checkPlatingBathFit(layoutFor(70, 50), noOffsets, {
    ...defaultElectroplatingContainer,
    maxBoardWidthMm: 55,
    maxBoardHeightMm: 75,
    allowRotation: true,
  });

  expect(fit.fits).toBe(true);
  expect(fit.orientation).toBe("rotated");
});

test("bath fit failure suggests offset reductions when zero-offset board can fit", () => {
  const offsets = { left: 16, right: 4, top: 4, bottom: 4 };
  const fit = checkPlatingBathFit(layoutFor(50, 50, offsets), offsets, {
    ...defaultElectroplatingContainer,
    maxBoardWidthMm: 64,
    maxBoardHeightMm: 58,
  });

  expect(fit.fits).toBe(false);
  expect(fit.message).toContain("does not fit");
  expect(fit.suggestions.join(" ")).toContain("left+right <= 14mm");
  expect(fit.suggestions.join(" ")).toContain("left=10");
});

test("bath fit failure reports impossible boards without offset suggestions", () => {
  const fit = checkPlatingBathFit(layoutFor(100, 50), noOffsets, {
    ...defaultElectroplatingContainer,
    maxBoardWidthMm: 90,
    maxBoardHeightMm: 40,
    allowRotation: true,
  });

  expect(fit.fits).toBe(false);
  expect(fit.suggestions).toEqual([]);
  expect(fit.message).toContain("cannot fit this bath even with zero");
});
