import { expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import {
  magazineCategoryFor,
  parseDrillFilename,
  selectStepDrills,
} from "./selectStepDrills";

const BOARD = "new-and-improved-zefir-btn";
const DRILLS_DIR = join(import.meta.dir, "..", "..", "..", "testdir", "drills");

const realListing = () =>
  readdirSync(DRILLS_DIR).filter((f) => f.toLowerCase().endsWith(".drl"));

test("parseDrillFilename splits on the LAST underscore (board has hyphens)", () => {
  expect(parseDrillFilename(`${BOARD}_PTH-drills-0.4mm.drl`)).toEqual({
    board: BOARD,
    category: "PTH",
    method: "drills",
    diameterMm: 0.4,
  });
});

test("parseDrillFilename handles alignment pockets and NPTH", () => {
  expect(parseDrillFilename(`${BOARD}_alignment-pockets-1.5mm.drl`)).toEqual({
    board: BOARD,
    category: "alignment",
    method: "pockets",
    diameterMm: 1.5,
  });
  expect(parseDrillFilename(`${BOARD}_NPTH-drills-0.7mm.drl`)).toEqual({
    board: BOARD,
    category: "NPTH",
    method: "drills",
    diameterMm: 0.7,
  });
});

test("parseDrillFilename rejects non-matching names", () => {
  expect(parseDrillFilename("foo.gbr")).toBeUndefined();
  expect(parseDrillFilename("no-underscore.drl")).toBeUndefined();
  expect(parseDrillFilename(`${BOARD}_PTH-drills.drl`)).toBeUndefined();
});

test("plated step selects alignment (pocket!) + PTH, drills before pockets, asc dia", () => {
  const selected = selectStepDrills(realListing(), BOARD, "plated");
  const labels = selected.map(
    (s) => `${s.category}-${s.method}-${s.diameterMm}`,
  );

  expect(labels).toContain("alignment-pockets-1.5");
  expect(labels).toContain("PTH-drills-0.4");
  expect(labels).toContain("PTH-drills-0.5");
  expect(labels).toContain("PTH-drills-0.8");
  expect(labels).toContain("PTH-pockets-0.6");
  expect(labels.some((l) => l.startsWith("NPTH"))).toBe(false);

  const lastDrill = selected.map((s) => s.method).lastIndexOf("drills");
  const firstPocket = selected.map((s) => s.method).indexOf("pockets");
  expect(lastDrill).toBeLessThan(firstPocket);
});

test("final step selects only NPTH", () => {
  const selected = selectStepDrills(realListing(), BOARD, "final");
  const labels = selected.map(
    (s) => `${s.category}-${s.method}-${s.diameterMm}`,
  );
  expect(labels).toEqual(["NPTH-drills-0.7"]);
});

test("magazineCategoryFor maps method to the magazine category", () => {
  expect(magazineCategoryFor("drills")).toBe("Drill");
  expect(magazineCategoryFor("pockets")).toBe("Corn Bits");
  expect(magazineCategoryFor("contour")).toBe("Corn Bits");
});

test("parseDrillFilename keeps underscores inside the board name", () => {
  expect(parseDrillFilename("my_cool_board_PTH-drills-0.4mm.drl")).toEqual({
    board: "my_cool_board",
    category: "PTH",
    method: "drills",
    diameterMm: 0.4,
  });
});

test("parseDrillFilename accepts integer and leading-dot diameters", () => {
  expect(parseDrillFilename(`${BOARD}_PTH-drills-1mm.drl`)?.diameterMm).toBe(1);
  expect(parseDrillFilename(`${BOARD}_PTH-drills-.5mm.drl`)?.diameterMm).toBe(
    0.5,
  );
  expect(parseDrillFilename(`${BOARD}_PTH-drills-0.mm.drl`)).toBeUndefined();
});

test("selectStepDrills orders PTH drills by ascending diameter", () => {
  const diameters = selectStepDrills(realListing(), BOARD, "plated")
    .filter((s) => s.category === "PTH" && s.method === "drills")
    .map((s) => s.diameterMm);
  expect(diameters).toEqual([0.4, 0.5, 0.8]);
});

test("selectStepDrills excludes drills from other boards", () => {
  const files = [
    `${BOARD}_PTH-drills-0.4mm.drl`,
    "other-board_PTH-drills-0.4mm.drl",
  ];
  expect(selectStepDrills(files, BOARD, "plated").map((s) => s.board)).toEqual([
    BOARD,
  ]);
});
