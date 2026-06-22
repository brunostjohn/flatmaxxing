import { expect, test } from "bun:test";
import type { IDxf } from "dxf-parser";
import DxfParser from "dxf-parser";
import { Effect, Exit } from "effect";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getDxfBounds } from "@/stages/xtool/geometry";
import { hasPlottableDxfGeometry } from "@/stages/xtool/workflow/hasPlottableDxfGeometry";
import { dxfBounds, dxfHasPlottableGeometry } from "./dxfCompute";

const fixture = (filename: string) => {
  const dxf = new DxfParser().parseSync(
    readFileSync(resolve(process.cwd(), "testdir/dxf", filename), "utf8"),
  );
  if (!dxf) throw new Error("Failed to parse DXF fixture");
  return dxf;
};

test("worker dxfBounds matches the direct (main-thread) result", async () => {
  const dxf = fixture("valid_board-F_Mask.dxf");
  const viaWorker = await Effect.runPromise(dxfBounds(dxf));
  expect(viaWorker).toEqual(getDxfBounds(dxf));
});

test("worker dxfHasPlottableGeometry matches the direct result", async () => {
  const dxf = fixture("valid_board-F_Paste.dxf");
  const viaWorker = await Effect.runPromise(dxfHasPlottableGeometry(dxf));
  expect(viaWorker).toBe(hasPlottableDxfGeometry(dxf));
  expect(viaWorker).toBe(true);
});

test("multiple worker computations run in parallel and all resolve", async () => {
  // Front fixtures both carry geometry (this board's back side is empty).
  const files = ["valid_board-F_Mask.dxf", "valid_board-F_Paste.dxf"];
  const results = await Effect.runPromise(
    Effect.all(
      files.map((f) => dxfBounds(fixture(f))),
      { concurrency: "unbounded" },
    ),
  );
  expect(results).toHaveLength(2);
  for (const bounds of results) {
    expect(bounds.width).toBeGreaterThan(0);
    expect(bounds.height).toBeGreaterThan(0);
  }
});

test("worker surfaces the empty-DXF error as an Effect failure", async () => {
  const empty = { entities: [] } as unknown as IDxf;
  const exit = await Effect.runPromiseExit(dxfBounds(empty));
  expect(Exit.isFailure(exit)).toBe(true);
});
