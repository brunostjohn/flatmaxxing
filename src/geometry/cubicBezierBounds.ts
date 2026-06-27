import { Array } from "effect";
import { EPSILON } from "./constants";

export interface Point {
  readonly x: number;
  readonly y: number;
}

const cubicBezierPointAt = (
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number,
): Point => {
  const u = 1 - t;
  const w0 = u * u * u;
  const w1 = 3 * u * u * t;
  const w2 = 3 * u * t * t;
  const w3 = t * t * t;

  return {
    x: w0 * p0.x + w1 * p1.x + w2 * p2.x + w3 * p3.x,
    y: w0 * p0.y + w1 * p1.y + w2 * p2.y + w3 * p3.y,
  };
};

const rootsInUnitInterval = (roots: readonly number[]) =>
  Array.filter(roots, (t) => Number.isFinite(t) && t > 0 && t < 1);

const quadraticRootsInUnitInterval = (a: number, b: number, c: number) => {
  if (Math.abs(a) < EPSILON) {
    if (Math.abs(b) < EPSILON) return [];
    return rootsInUnitInterval([-c / b]);
  }

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return [];

  const root = Math.sqrt(discriminant);
  return rootsInUnitInterval([(-b + root) / (2 * a), (-b - root) / (2 * a)]);
};

const axisExtremaPoints = (
  axis: "x" | "y",
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
) => {
  const a0 = p0[axis];
  const a1 = p1[axis];
  const a2 = p2[axis];
  const a3 = p3[axis];

  const a = -a0 + 3 * a1 - 3 * a2 + a3;
  const b = 2 * a0 - 4 * a1 + 2 * a2;
  const c = a1 - a0;

  return Array.map(quadraticRootsInUnitInterval(a, b, c), (t) =>
    cubicBezierPointAt(p0, p1, p2, p3, t),
  );
};

export const cubicBezierExtrema = (
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
): Point[] => [
  p0,
  p3,
  ...axisExtremaPoints("x", p0, p1, p2, p3),
  ...axisExtremaPoints("y", p0, p1, p2, p3),
];

export const cubicBezierBoundsPoints = (
  points: ReadonlyArray<Point>,
): Point[] => {
  if (points.length === 4) {
    const [p0, p1, p2, p3] = points;
    if (p0 && p1 && p2 && p3) {
      return cubicBezierExtrema(p0, p1, p2, p3);
    }
  }

  return [...points];
};
