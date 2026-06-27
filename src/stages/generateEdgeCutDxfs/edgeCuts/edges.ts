import type { Coordinate } from "@/geometry/dxfWriter";
import type {
  EdgeCutArc,
  EdgeCutPrimitive,
} from "@/stages/kicad/board/edgeCutsTraversal";
import { Array, Result } from "effect";
import { BEZIER_TOLERANCE_MM } from "./constants";
import {
  angleOf,
  circleFromThreePoints,
  flattenCubicAdaptive,
  isAngleBetweenClockwise,
  samePoint,
} from "./geometry";
import type { Edge } from "./types";

const lineBetween = (start: Coordinate, end: Coordinate): Edge => ({
  kind: "line",
  start,
  end,
});

const lineSegments = (points: readonly Coordinate[]) =>
  Array.filterMap(points, (point, index) => {
    const next = points[index + 1];
    return next && !samePoint(point, next)
      ? Result.succeed(lineBetween(point, next))
      : Result.fail(undefined);
  });

const closingSegment = (points: readonly Coordinate[]) => {
  const first = points[0];
  const last = points[points.length - 1];
  return first && last && !samePoint(first, last)
    ? [lineBetween(last, first)]
    : [];
};

const polyToEdges = (points: readonly Coordinate[]) => [
  ...lineSegments(points),
  ...closingSegment(points),
];

const arcToEdge = (arc: EdgeCutArc): Edge[] => {
  if (samePoint(arc.start, arc.end)) return [];

  const circle = circleFromThreePoints(arc.start, arc.mid, arc.end);
  if (!circle) return [lineBetween(arc.start, arc.end)];

  const startAngle = angleOf(circle.center, arc.start);
  const midAngle = angleOf(circle.center, arc.mid);
  const endAngle = angleOf(circle.center, arc.end);
  const cw = isAngleBetweenClockwise(midAngle, startAngle, endAngle);

  return [
    {
      kind: "arc",
      start: arc.start,
      end: arc.end,
      center: circle.center,
      cw,
    },
  ];
};

const rectToEdges = (
  start: Coordinate,
  end: Coordinate,
  transform: (point: Coordinate) => Coordinate,
) => {
  const corners = [
    transform(start),
    transform({ x: end.x, y: start.y }),
    transform(end),
    transform({ x: start.x, y: end.y }),
  ];
  return Array.filterMap(corners, (corner, index) => {
    const next = corners[(index + 1) % corners.length]!;
    return samePoint(corner, next)
      ? Result.fail(undefined)
      : Result.succeed(lineBetween(corner, next));
  });
};

const flattenCurve = (controlPoints: readonly Coordinate[]) => {
  if (controlPoints.length !== 4) {
    return polyToEdges(controlPoints);
  }
  const [p0, p1, p2, p3] = controlPoints as [
    Coordinate,
    Coordinate,
    Coordinate,
    Coordinate,
  ];

  return lineSegments(
    flattenCubicAdaptive(p0, p1, p2, p3, BEZIER_TOLERANCE_MM),
  );
};

export const toEdges = (primitive: EdgeCutPrimitive): Edge[] => {
  switch (primitive.kind) {
    case "segment":
      return samePoint(primitive.start, primitive.end)
        ? []
        : [lineBetween(primitive.start, primitive.end)];
    case "arc":
      return arcToEdge(primitive);
    case "curve":
      return flattenCurve(primitive.controlPoints);
    case "poly":
      return polyToEdges(primitive.points);
    case "rect":
      return rectToEdges(primitive.start, primitive.end, primitive.transform);
    case "circle":
      return [];
  }
};

export const reverseEdge = (edge: Edge): Edge =>
  edge.kind === "line"
    ? { kind: "line", start: edge.end, end: edge.start }
    : {
        kind: "arc",
        start: edge.end,
        end: edge.start,
        center: edge.center,
        cw: !edge.cw,
      };
