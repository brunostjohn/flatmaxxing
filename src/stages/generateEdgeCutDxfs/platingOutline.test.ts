import type { Coordinate, PathCmd } from "@/geometry/dxfWriter";
import { expect, test } from "bun:test";
import { buildPlatingRoundedRect } from "./platingOutline";

const noOffsets = { left: 0, right: 0, top: 0, bottom: 0 };

const allPoints = (start: Coordinate, cmds: readonly PathCmd[]) => [
  start,
  ...cmds.map((c) => c.to),
];

const boundsOf = (points: readonly Coordinate[]) => ({
  minX: Math.min(...points.map((p) => p.x)),
  minY: Math.min(...points.map((p) => p.y)),
  maxX: Math.max(...points.map((p) => p.x)),
  maxY: Math.max(...points.map((p) => p.y)),
});

test("a zero-radius rounded rect is a plain rectangle that fits the bounds", () => {
  const { start, cmds } = buildPlatingRoundedRect(
    { minX: 0, minY: 0, maxX: 10, maxY: 6 },
    [],
    noOffsets,
    0,
  );
  expect(cmds.every((c) => c.kind === "line")).toBe(true);
  const b = boundsOf(allPoints(start, cmds));
  expect(b).toEqual({ minX: 0, minY: 0, maxX: 10, maxY: 6 });
});

test("a rounded rect emits 4 lines + 4 arcs with correct corner coordinates", () => {
  const radius = 2;
  const { start, cmds } = buildPlatingRoundedRect(
    { minX: 0, minY: 0, maxX: 10, maxY: 8 },
    [],
    noOffsets,
    radius,
  );

  expect(cmds.filter((c) => c.kind === "line")).toHaveLength(4);
  expect(cmds.filter((c) => c.kind === "arc")).toHaveLength(4);

  for (const cmd of cmds) {
    if (cmd.kind === "arc") expect(cmd.cw).toBe(false);
  }

  expect(start).toEqual({ x: radius, y: 0 });

  const arcCenters = cmds.filter((c) => c.kind === "arc").map((c) => c.center);
  expect(arcCenters).toEqual([
    { x: 10 - radius, y: radius },
    { x: 10 - radius, y: 8 - radius },
    { x: radius, y: 8 - radius },
    { x: radius, y: radius },
  ]);

  const b = boundsOf(allPoints(start, cmds));
  expect(b).toEqual({ minX: 0, minY: 0, maxX: 10, maxY: 8 });
});

test("the corner radius is clamped to half the shorter side", () => {
  const { start, cmds } = buildPlatingRoundedRect(
    { minX: 0, minY: 0, maxX: 20, maxY: 6 },
    [],
    noOffsets,
    100,
  );
  const arc = cmds.find((c) => c.kind === "arc")!;
  expect(arc.center.y).toBeCloseTo(3);
  expect(start.x).toBeCloseTo(3);
});

test("asymmetric offsets expand each side independently", () => {
  const { start, cmds } = buildPlatingRoundedRect(
    { minX: 0, minY: 0, maxX: 10, maxY: 10 },
    [],
    { left: 1, right: 2, top: 3, bottom: 4 },
    0,
  );
  const b = boundsOf(allPoints(start, cmds));
  expect(b.minX).toBe(-1);
  expect(b.maxX).toBe(12);
  expect(b.minY).toBe(-3);
  expect(b.maxY).toBe(14);
});

test("the rect is unioned with alignment points outside the board bounds", () => {
  const alignment: Coordinate[] = [
    { x: -5, y: -5 },
    { x: 15, y: -5 },
    { x: -5, y: 15 },
    { x: 15, y: 15 },
  ];
  const { start, cmds } = buildPlatingRoundedRect(
    { minX: 0, minY: 0, maxX: 10, maxY: 10 },
    alignment,
    noOffsets,
    0,
  );
  const b = boundsOf(allPoints(start, cmds));
  expect(b.minX).toBeLessThanOrEqual(-5);
  expect(b.minY).toBeLessThanOrEqual(-5);
  expect(b.maxX).toBeGreaterThanOrEqual(15);
  expect(b.maxY).toBeGreaterThanOrEqual(15);
});
