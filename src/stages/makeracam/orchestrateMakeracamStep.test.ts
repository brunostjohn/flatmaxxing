import { expect, test } from "bun:test";
import { Effect, Path } from "effect";
import { join } from "node:path";
import {
  assignToolNumbers,
  planToolpaths,
  stepFilename,
} from "./orchestrateMakeracamStep";
import type { ToolpathKind } from "./types";

const tp = (
  kind: ToolpathKind,
  diameterMm: number,
  method = kind === "drill" ? "drills" : "pockets",
) => ({
  file: `${kind}-${diameterMm}`,
  absPath: `${kind}-${diameterMm}`,
  kind,
  category: kind === "contour" ? "edge" : "PTH",
  method,
  diameterMm,
});

const contour = tp("contour", 0, "contour");

const runPlan = (
  files: readonly string[],
  board: string,
  step: "plated" | "final",
  drillsDir: string,
  edgeCutGerberPath: string,
) =>
  Effect.runSync(
    planToolpaths(files, board, step, drillsDir, edgeCutGerberPath).pipe(
      Effect.provide(Path.layer),
    ),
  );

test("stepFilename encodes the exact per-step export base name", () => {
  expect(stepFilename("myboard", "plated")).toBe(
    "myboard_align-PTH_Holes-PTH_EdgeCuts",
  );
  expect(stepFilename("myboard", "final")).toBe(
    "myboard_NPTH_Holes-Final_EdgeCuts",
  );
});

test("planToolpaths puts the contour first and maps drills after it", () => {
  const files = ["board_PTH-drills-0.4mm.drl", "board_PTH-pockets-0.6mm.drl"];
  const planned = runPlan(
    files,
    "board",
    "plated",
    "/drills",
    "/gerbers/board-PTH_EdgeCuts.dxf",
  );

  expect(planned).toHaveLength(3);
  expect(planned[0]).toMatchObject({
    kind: "contour",
    file: "board-PTH_EdgeCuts.dxf",
    absPath: "/gerbers/board-PTH_EdgeCuts.dxf",
  });
  expect(planned[1]).toMatchObject({
    kind: "drill",
    method: "drills",
    absPath: join("/drills", "board_PTH-drills-0.4mm.drl"),
  });
  expect(planned[2]).toMatchObject({ kind: "pocket", method: "pockets" });
});

test("assignToolNumbers reuses one number per identical tool", () => {
  expect(assignToolNumbers([contour], 3)).toEqual([1]);

  expect(assignToolNumbers([tp("drill", 0.5), tp("drill", 0.5)], 3)).toEqual([
    1, 1,
  ]);

  expect(assignToolNumbers([tp("drill", 0.4), tp("drill", 0.5)], 3)).toEqual([
    1, 2,
  ]);
});

test("assignToolNumbers distinguishes drills from mills of equal diameter", () => {
  expect(assignToolNumbers([tp("pocket", 3), contour], 3)).toEqual([1, 1]);

  expect(assignToolNumbers([tp("drill", 3), tp("pocket", 3)], 3)).toEqual([
    1, 2,
  ]);
});

test("assignToolNumbers numbers the contour by its last (reordered) position", () => {
  const planned = [contour, tp("drill", 0.4), tp("drill", 0.5)];
  const numbers = assignToolNumbers(planned, 1);
  expect(numbers).toEqual([1, 2, 3]);
  expect(numbers.at(-1)).toBe(3);
});
