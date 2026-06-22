import { expect, test } from "bun:test";
import {
  alignmentDrillPoints,
  renderAlignmentExcellon,
} from "./alignmentDrills";

const bounds = { xmin: 0, ymin: 0, xmax: 42.5, ymax: 25 };

test("places four corner holes offset outward by distance", () => {
  const pts = alignmentDrillPoints(bounds, { x: 6, y: 6 });
  expect(pts).toEqual([
    { x: -6, y: -6 },
    { x: 48.5, y: -6 },
    { x: -6, y: 31 },
    { x: 48.5, y: 31 },
  ]);
});

test("pattern centre equals the board centre (the mirror axis)", () => {
  const pts = alignmentDrillPoints(bounds, { x: 6, y: 6 });
  const cx =
    (Math.min(...pts.map((p) => p.x)) + Math.max(...pts.map((p) => p.x))) / 2;
  const cy =
    (Math.min(...pts.map((p) => p.y)) + Math.max(...pts.map((p) => p.y))) / 2;
  expect(cx).toBe((bounds.xmin + bounds.xmax) / 2);
  expect(cy).toBe((bounds.ymin + bounds.ymax) / 2);
});

test("renders a valid single-tool metric Excellon", () => {
  const drl = renderAlignmentExcellon(
    alignmentDrillPoints(bounds, { x: 6, y: 6 }),
    2,
  );
  expect(drl).toContain("M48");
  expect(drl).toContain("METRIC");
  expect(drl).toContain("T1C2.0000");
  expect(drl).toContain("X-6.0000Y-6.0000");
  expect(drl).toContain("X48.5000Y31.0000");
  expect(drl.trimEnd().endsWith("M30")).toBe(true);
  // exactly four drill coordinate lines
  expect(drl.match(/^X.*Y.*$/gm)).toHaveLength(4);
});
