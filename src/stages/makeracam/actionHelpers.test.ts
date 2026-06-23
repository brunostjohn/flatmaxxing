import { expect, test } from "bun:test";
import {
  layerSelectorFor,
  layerTitleKey,
  layerTitleMatchesStem,
  tabControlVisibility,
  titleValues,
} from "./actionHelpers";

test("layerTitleKey is stable for equal title values from separate AX scans", () => {
  const first = {
    title: "board-PTH_EdgeCuts",
    description: "Layer",
    value: undefined,
  };
  const second = {
    title: "board-PTH_EdgeCuts",
    description: "Layer",
    value: undefined,
  };

  expect(first).not.toBe(second);
  expect(layerTitleKey(first)).toBe(layerTitleKey(second));
});

test("layerTitleMatchesStem requires one title slot to include the imported stem", () => {
  expect(
    layerTitleMatchesStem(
      {
        title: undefined,
        description: "Imported zefir-Final_EdgeCuts",
        value: undefined,
      },
      "zefir-Final_EdgeCuts",
    ),
  ).toBe(true);

  expect(
    layerTitleMatchesStem(
      {
        title: "old-board-PTH_EdgeCuts",
        description: undefined,
        value: undefined,
      },
      "zefir-Final_EdgeCuts",
    ),
  ).toBe(false);
});

test("titleValues omits empty and missing title slots", () => {
  expect(
    titleValues({ title: "", description: "Tool Magazine", value: undefined }),
  ).toEqual(["Tool Magazine"]);
});

test("tabControlVisibility separates missing, visible, and out-of-band controls", () => {
  expect(tabControlVisibility(undefined, 10, 20)).toBe("missing");
  expect(tabControlVisibility({ cy: 15 }, 10, 20)).toBe("visible");
  expect(tabControlVisibility({ cy: 25 }, 10, 20)).toBe("outside");
});

test("layerSelectorFor prefers the slot carrying the stem, else the first value", () => {
  expect(
    layerSelectorFor(
      {
        title: undefined,
        description: "Imported zefir-Final_EdgeCuts",
        value: undefined,
      },
      "zefir-Final_EdgeCuts",
    ),
  ).toBe("Imported zefir-Final_EdgeCuts");

  expect(
    layerSelectorFor(
      { title: "Layer 1", description: undefined, value: undefined },
      "zefir-Final_EdgeCuts",
    ),
  ).toBe("Layer 1");
});
