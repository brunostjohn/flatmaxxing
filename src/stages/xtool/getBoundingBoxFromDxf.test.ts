import { expect, test } from "bun:test";
import DxfParser, { type IDxf } from "dxf-parser";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getDxfBounds } from "./geometry";
import { addPolyline, type BulgeVertex } from "./geometry/addPolyline";
import { emptyBox } from "./geometry/emptyBox";

const makeDxf = (entities: unknown[]): IDxf => ({ entities }) as IDxf;

const polylineBox = (vertices: BulgeVertex[], closed: boolean) => {
  const box = emptyBox();
  addPolyline(box, vertices, closed);
  return box;
};

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

test("gets artwork bounds from a generated KiCad paste DXF", () => {
  expect(getDxfBounds(readDxfFixture("valid_board-F_Paste.dxf"))).toEqual({
    width: 24.9,
    height: 21.4,
  });
});

test("gets board outline bounds from a generated KiCad mask DXF", () => {
  expect(getDxfBounds(readDxfFixture("valid_board-F_Mask.dxf"))).toEqual({
    width: 42.5,
    height: 25,
  });
});

test("uses the actual arc span instead of the full circle", () => {
  const bounds = getDxfBounds(
    makeDxf([
      {
        type: "ARC",
        center: { x: 0, y: 0, z: 0 },
        radius: 10,
        startAngle: 0,
        endAngle: Math.PI / 2,
      },
    ]),
  );

  expect(bounds.width).toBeCloseTo(10);
  expect(bounds.height).toBeCloseTo(10);
});

test("handles full ellipse bounds", () => {
  const bounds = getDxfBounds(
    makeDxf([
      {
        type: "ELLIPSE",
        center: { x: 0, y: 0, z: 0 },
        majorAxisEndPoint: { x: 5, y: 0, z: 0 },
        axisRatio: 0.5,
        startAngle: 0,
        endAngle: Math.PI * 2,
      },
    ]),
  );

  expect(bounds.width).toBeCloseTo(10);
  expect(bounds.height).toBeCloseTo(5);
});

test("bounds a SPLINE by the convex hull of its control points", () => {
  const bounds = getDxfBounds(
    makeDxf([
      {
        type: "SPLINE",
        controlPoints: [
          { x: 0, y: 0, z: 0 },
          { x: 5, y: 10, z: 0 },
          { x: 10, y: -2, z: 0 },
          { x: 12, y: 4, z: 0 },
        ],
      },
    ]),
  );

  expect(bounds.width).toBeCloseTo(12);
  expect(bounds.height).toBeCloseTo(12);
});

test("falls back to fit points when a SPLINE has no control points", () => {
  const bounds = getDxfBounds(
    makeDxf([
      {
        type: "SPLINE",
        closed: true,
        fitPoints: [
          { x: 1, y: 1, z: 0 },
          { x: 2, y: 8, z: 0 },
          { x: 9, y: 3, z: 0 },
        ],
      },
    ]),
  );

  expect(bounds.width).toBeCloseTo(8);
  expect(bounds.height).toBeCloseTo(7);
});

test("a polyline bulge expands the bounds beyond the straight chord", () => {
  const bounds = getDxfBounds(
    makeDxf([
      {
        type: "LWPOLYLINE",
        shape: false,
        vertices: [
          { x: 0, y: 0, bulge: 1 },
          { x: 10, y: 0 },
        ],
      },
    ]),
  );

  // A straight chord would have zero height; the semicircle arcs to ±5.
  expect(bounds.width).toBeCloseTo(10);
  expect(bounds.height).toBeCloseTo(5);
});

test("POLYLINE bulge handling matches LWPOLYLINE", () => {
  const bounds = getDxfBounds(
    makeDxf([
      {
        type: "POLYLINE",
        shape: false,
        vertices: [
          { x: 0, y: 0, bulge: 1 },
          { x: 10, y: 0 },
        ],
      },
    ]),
  );

  expect(bounds.width).toBeCloseTo(10);
  expect(bounds.height).toBeCloseTo(5);
});

test("a positive bulge arcs clockwise-down, a negative bulge arcs up", () => {
  // Positive bulge sweeps CCW from start to end -> dips below the chord.
  expect(
    polylineBox(
      [
        { x: 0, y: 0, bulge: 1 },
        { x: 10, y: 0 },
      ],
      false,
    ),
  ).toEqual({ minX: 0, minY: -5, maxX: 10, maxY: 0 });
  // Negative bulge sweeps the other way -> rises above the chord.
  expect(
    polylineBox(
      [
        { x: 0, y: 0, bulge: -1 },
        { x: 10, y: 0 },
      ],
      false,
    ),
  ).toEqual({ minX: 0, minY: 0, maxX: 10, maxY: 5 });
});

test("a closed two-vertex polyline of two bulges forms a full circle", () => {
  expect(
    polylineBox(
      [
        { x: 0, y: 0, bulge: 1 },
        { x: 10, y: 0, bulge: 1 },
      ],
      true,
    ),
  ).toEqual({ minX: 0, minY: -5, maxX: 10, maxY: 5 });
});

test("a polyline without bulges is bounded by its vertices", () => {
  expect(
    polylineBox(
      [
        { x: 0, y: 0 },
        { x: 3, y: 4 },
        { x: -2, y: 1 },
      ],
      false,
    ),
  ).toEqual({ minX: -2, minY: 0, maxX: 3, maxY: 4 });
});

test("measures the real curved board's mask DXF when it has been generated", () => {
  const fixture = resolve(
    process.cwd(),
    "testdir/dxf/new-and-improved-zefir-btn-F_Mask.dxf",
  );
  if (!existsSync(fixture)) return; // generated locally via kicad-cli; skip if absent

  const dxf = new DxfParser().parseSync(readFileSync(fixture, "utf8"));
  if (!dxf) throw new Error("Failed to parse mask DXF fixture");

  const bounds = getDxfBounds(dxf);

  // Curved Edge.Cuts outline, ~44 mm x 43.6 mm (incl. ~0.2 mm stroke).
  expect(bounds.width).toBeCloseTo(44, 1);
  expect(bounds.height).toBeCloseTo(43.59, 1);
});
