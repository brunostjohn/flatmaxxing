import { cubicBezierBoundsPoints } from "@/geometry/cubicBezierBounds";
import { BoardValidationError } from "@/errors";
import {
  collectEdgeCutPrimitives,
  type Coordinate,
  type EdgeCutPrimitive,
} from "@/stages/kicad/board/edgeCutsTraversal";
import { Array, Match, Result } from "effect";
import type { KicadPcb } from "kicadts";

export type { Coordinate } from "@/stages/kicad/board/edgeCutsTraversal";

export interface BoardBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

const CARDINAL_ANGLES = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2] as const;
const GEOMETRY_EPSILON = 1e-9;

export const getBottomLeftBoardOrigin = (pcb: KicadPcb): Coordinate => {
  const bounds = findEdgeCutsBounds(pcb);
  return { x: bounds.minX, y: bounds.maxY };
};

export const findEdgeCutsBounds = (pcb: KicadPcb): BoardBounds => {
  const points = Array.flatMap(collectEdgeCutPrimitives(pcb), primitivePoints);
  const bounds = Array.reduce(points, emptyBounds, includePoint);

  if (!hasBounds(bounds)) {
    throw new BoardValidationError({
      message:
        "No Edge.Cuts geometry was found, so the board origin cannot be inferred.",
    });
  }

  return bounds;
};

const primitivePoints = (primitive: EdgeCutPrimitive): readonly Coordinate[] =>
  Match.value(primitive).pipe(
    Match.when({ kind: "segment" }, (segment) => [segment.start, segment.end]),
    Match.when({ kind: "arc" }, (arc) =>
      arcPoints(arc.start, arc.mid, arc.end),
    ),
    Match.when({ kind: "circle" }, (circle) =>
      circlePoints(circle.center, circle.edge),
    ),
    Match.when({ kind: "rect" }, (rect) =>
      rectPoints(rect.start, rect.end, rect.transform),
    ),
    Match.when({ kind: "poly" }, (poly) => poly.points),
    Match.when({ kind: "curve" }, (curve) =>
      cubicBezierBoundsPoints(curve.controlPoints),
    ),
    Match.exhaustive,
  );

const emptyBounds: BoardBounds = {
  minX: Number.POSITIVE_INFINITY,
  minY: Number.POSITIVE_INFINITY,
  maxX: Number.NEGATIVE_INFINITY,
  maxY: Number.NEGATIVE_INFINITY,
};

const hasBounds = (bounds: BoardBounds): boolean =>
  Number.isFinite(bounds.minX) &&
  Number.isFinite(bounds.minY) &&
  Number.isFinite(bounds.maxX) &&
  Number.isFinite(bounds.maxY);

const includePoint = (bounds: BoardBounds, point: Coordinate): BoardBounds => ({
  minX: Math.min(bounds.minX, point.x),
  minY: Math.min(bounds.minY, point.y),
  maxX: Math.max(bounds.maxX, point.x),
  maxY: Math.max(bounds.maxY, point.y),
});

const rectPoints = (
  start: Coordinate,
  end: Coordinate,
  transform: (point: Coordinate) => Coordinate,
): readonly Coordinate[] =>
  Array.map(
    [start, { x: start.x, y: end.y }, end, { x: end.x, y: start.y }],
    transform,
  );

const circlePoints = (
  center: Coordinate,
  edge: Coordinate,
): readonly Coordinate[] => {
  const radius = distance(center, edge);
  return [
    { x: center.x - radius, y: center.y },
    { x: center.x + radius, y: center.y },
    { x: center.x, y: center.y - radius },
    { x: center.x, y: center.y + radius },
  ];
};

const arcPoints = (
  start: Coordinate,
  mid: Coordinate,
  end: Coordinate,
): readonly Coordinate[] => {
  const circle = circleFromThreePoints(start, mid, end);
  if (!circle) {
    return [start, mid, end];
  }

  const startAngle = angleOf(circle.center, start);
  const midAngle = angleOf(circle.center, mid);
  const endAngle = angleOf(circle.center, end);
  const direction = isAngleBetweenClockwise(midAngle, startAngle, endAngle)
    ? "clockwise"
    : "counterclockwise";

  const extrema = Array.filterMap(CARDINAL_ANGLES, (angle) => {
    const isOnArc =
      direction === "clockwise"
        ? isAngleBetweenClockwise(angle, startAngle, endAngle)
        : isAngleBetweenCounterClockwise(angle, startAngle, endAngle);

    return isOnArc
      ? Result.succeed({
          x: circle.center.x + circle.radius * Math.cos(angle),
          y: circle.center.y + circle.radius * Math.sin(angle),
        })
      : Result.fail(null);
  });

  return [start, mid, end, ...extrema];
};

const distance = (a: Coordinate, b: Coordinate): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

export const angleOf = (center: Coordinate, point: Coordinate): number =>
  normalizeAngle(Math.atan2(point.y - center.y, point.x - center.x));

const normalizeAngle = (angle: number): number => {
  const normalized = angle % (2 * Math.PI);
  return normalized < 0 ? normalized + 2 * Math.PI : normalized;
};

const clockwiseDistance = (from: number, to: number): number =>
  normalizeAngle(from - to);

const counterClockwiseDistance = (from: number, to: number): number =>
  normalizeAngle(to - from);

export const isAngleBetweenClockwise = (
  angle: number,
  start: number,
  end: number,
): boolean => clockwiseDistance(start, angle) <= clockwiseDistance(start, end);

const isAngleBetweenCounterClockwise = (
  angle: number,
  start: number,
  end: number,
): boolean =>
  counterClockwiseDistance(start, angle) <=
  counterClockwiseDistance(start, end);

export const circleFromThreePoints = (
  a: Coordinate,
  b: Coordinate,
  c: Coordinate,
):
  | {
      readonly center: Coordinate;
      readonly radius: number;
    }
  | undefined => {
  const determinant =
    2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));

  if (Math.abs(determinant) < GEOMETRY_EPSILON) {
    return undefined;
  }

  const aSquared = a.x ** 2 + a.y ** 2;
  const bSquared = b.x ** 2 + b.y ** 2;
  const cSquared = c.x ** 2 + c.y ** 2;

  const center = {
    x:
      (aSquared * (b.y - c.y) +
        bSquared * (c.y - a.y) +
        cSquared * (a.y - b.y)) /
      determinant,
    y:
      (aSquared * (c.x - b.x) +
        bSquared * (a.x - c.x) +
        cSquared * (b.x - a.x)) /
      determinant,
  };

  return {
    center,
    radius: distance(center, a),
  };
};
