export type Point = { readonly x: number; readonly y: number };

const EPSILON = 1e-9;

/**
 * Returns the bounding-relevant points of a cubic Bézier curve defined by its
 * four control points: the two endpoints plus any interior axis-extrema (points
 * where dx/dt or dy/dt is zero). The axis-aligned bounding box of these points
 * is the exact bounding box of the curve.
 */
export function cubicBezierExtrema(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
): Point[] {
  const points: Point[] = [p0, p3];

  for (const axis of ["x", "y"] as const) {
    const a0 = p0[axis];
    const a1 = p1[axis];
    const a2 = p2[axis];
    const a3 = p3[axis];

    // The derivative of a cubic Bézier is the quadratic A·t² + B·t + C.
    const a = -a0 + 3 * a1 - 3 * a2 + a3;
    const b = 2 * a0 - 4 * a1 + 2 * a2;
    const c = a1 - a0;

    for (const t of quadraticRootsInUnitInterval(a, b, c)) {
      points.push(cubicBezierPointAt(p0, p1, p2, p3, t));
    }
  }

  return points;
}

/**
 * Bounding-relevant points for an arbitrary list of Bézier control points.
 * For a cubic (exactly four points) the exact extrema are returned; otherwise
 * the control points themselves are returned, which always bound the curve via
 * the convex-hull property (a Bézier never leaves the hull of its controls).
 */
export function cubicBezierBoundsPoints(points: ReadonlyArray<Point>): Point[] {
  if (points.length === 4) {
    const [p0, p1, p2, p3] = points;
    if (p0 && p1 && p2 && p3) {
      return cubicBezierExtrema(p0, p1, p2, p3);
    }
  }

  return [...points];
}

function cubicBezierPointAt(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number,
): Point {
  const u = 1 - t;
  const w0 = u * u * u;
  const w1 = 3 * u * u * t;
  const w2 = 3 * u * t * t;
  const w3 = t * t * t;

  return {
    x: w0 * p0.x + w1 * p1.x + w2 * p2.x + w3 * p3.x,
    y: w0 * p0.y + w1 * p1.y + w2 * p2.y + w3 * p3.y,
  };
}

function quadraticRootsInUnitInterval(
  a: number,
  b: number,
  c: number,
): number[] {
  // Degenerate to a linear equation when the quadratic coefficient vanishes.
  if (Math.abs(a) < EPSILON) {
    if (Math.abs(b) < EPSILON) return [];
    return rootsInUnitInterval([-c / b]);
  }

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return [];

  const root = Math.sqrt(discriminant);
  return rootsInUnitInterval([(-b + root) / (2 * a), (-b - root) / (2 * a)]);
}

function rootsInUnitInterval(roots: number[]): number[] {
  return roots.filter((t) => Number.isFinite(t) && t > 0 && t < 1);
}
