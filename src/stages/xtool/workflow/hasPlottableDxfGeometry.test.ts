import { expect, test } from "bun:test";
import DxfParser from "dxf-parser";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { hasPlottableDxfGeometry } from "./hasPlottableDxfGeometry";

const readDxfFixture = (filename: string) => {
  const parser = new DxfParser();
  const dxf = parser.parseSync(
    readFileSync(resolve(process.cwd(), "testdir/dxf", filename), "utf8"),
  );

  if (!dxf) {
    throw new Error("Failed to parse DXF fixture");
  }

  return dxf;
};

test("detects generated paste DXFs with plottable objects", () => {
  expect(
    hasPlottableDxfGeometry(readDxfFixture("valid_board-F_Paste.dxf")),
  ).toBe(true);
});

test("detects generated paste DXFs with no plottable objects", () => {
  expect(
    hasPlottableDxfGeometry(readDxfFixture("valid_board-B_Paste.dxf")),
  ).toBe(false);
});
