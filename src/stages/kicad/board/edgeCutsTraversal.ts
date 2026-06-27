import { Array, Result } from "effect";
import {
  At,
  PtsArc,
  type Footprint,
  type KicadPcb,
  type Layer,
  type Pts,
} from "kicadts";

export interface Coordinate {
  readonly x: number;
  readonly y: number;
}

export type PointTransform = (point: Coordinate) => Coordinate;

const GEOMETRY_EPSILON = 1e-9;

export interface EdgeCutSegment {
  readonly kind: "segment";
  readonly start: Coordinate;
  readonly end: Coordinate;
}

export interface EdgeCutArc {
  readonly kind: "arc";
  readonly start: Coordinate;
  readonly mid: Coordinate;
  readonly end: Coordinate;
}

export interface EdgeCutCircle {
  readonly kind: "circle";
  readonly center: Coordinate;
  readonly edge: Coordinate;
}

export interface EdgeCutRect {
  readonly kind: "rect";
  readonly start: Coordinate;
  readonly end: Coordinate;
  readonly transform: PointTransform;
}

export interface EdgeCutCurve {
  readonly kind: "curve";
  readonly controlPoints: readonly Coordinate[];
}

export interface EdgeCutPoly {
  readonly kind: "poly";
  readonly points: readonly Coordinate[];
}

export type EdgeCutPrimitive =
  | EdgeCutSegment
  | EdgeCutArc
  | EdgeCutCircle
  | EdgeCutRect
  | EdgeCutCurve
  | EdgeCutPoly;

const identityTransform: PointTransform = (point) => ({
  x: point.x,
  y: point.y,
});

const isEdgeCutsLayer = (layer: Layer | undefined): boolean =>
  layer?.names.includes("Edge.Cuts") ?? false;

const degreesToRadians = (degrees: number): number => (degrees * Math.PI) / 180;

const getFootprintTransform = (footprint: Footprint): PointTransform => {
  const position = footprint.position;
  if (!position) return identityTransform;

  const offset = { x: position.x, y: position.y };
  const angle = position instanceof At ? (position.angle ?? 0) : 0;

  if (Math.abs(angle) < GEOMETRY_EPSILON) {
    return (point) => ({ x: point.x + offset.x, y: point.y + offset.y });
  }

  const radians = degreesToRadians(angle);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return (point) => ({
    x: offset.x + point.x * cos - point.y * sin,
    y: offset.y + point.x * sin + point.y * cos,
  });
};

const onEdgeCutsLayer = <T extends { layer: Layer | undefined }>(
  items: readonly T[],
): readonly T[] => Array.filter(items, (item) => isEdgeCutsLayer(item.layer));

const segmentFrom = (
  layer: Layer | undefined,
  start: Coordinate | undefined,
  end: Coordinate | undefined,
  transform: PointTransform,
): Result.Result<EdgeCutSegment, null> =>
  isEdgeCutsLayer(layer) && start && end
    ? Result.succeed({
        kind: "segment",
        start: transform({ x: start.x, y: start.y }),
        end: transform({ x: end.x, y: end.y }),
      })
    : Result.fail(null);

const rectFrom = (
  layer: Layer | undefined,
  start: Coordinate | undefined,
  end: Coordinate | undefined,
  transform: PointTransform,
): Result.Result<EdgeCutRect, null> =>
  isEdgeCutsLayer(layer) && start && end
    ? Result.succeed({
        kind: "rect",
        start: { x: start.x, y: start.y },
        end: { x: end.x, y: end.y },
        transform,
      })
    : Result.fail(null);

const circleFrom = (
  layer: Layer | undefined,
  center: Coordinate | undefined,
  edge: Coordinate | undefined,
  transform: PointTransform,
): Result.Result<EdgeCutCircle, null> =>
  isEdgeCutsLayer(layer) && center && edge
    ? Result.succeed({
        kind: "circle",
        center: transform({ x: center.x, y: center.y }),
        edge: transform({ x: edge.x, y: edge.y }),
      })
    : Result.fail(null);

const arcFrom = (
  layer: Layer | undefined,
  start: Coordinate | undefined,
  mid: Coordinate | undefined,
  end: Coordinate | undefined,
  transform: PointTransform,
): Result.Result<EdgeCutArc, null> =>
  isEdgeCutsLayer(layer) && start && mid && end
    ? Result.succeed({
        kind: "arc",
        start: transform({ x: start.x, y: start.y }),
        mid: transform({ x: mid.x, y: mid.y }),
        end: transform({ x: end.x, y: end.y }),
      })
    : Result.fail(null);

const collectGraphics = (pcb: KicadPcb): readonly EdgeCutPrimitive[] => [
  ...Array.filterMap(pcb.graphicLines, (line) =>
    segmentFrom(line.layer, line.startPoint, line.endPoint, identityTransform),
  ),
  ...Array.filterMap(pcb.graphicRects, (rect) =>
    rectFrom(rect.layer, rect.startPoint, rect.endPoint, identityTransform),
  ),
  ...Array.filterMap(pcb.graphicCircles, (circle) =>
    circleFrom(
      circle.layer,
      circle.centerPoint,
      circle.endPoint,
      identityTransform,
    ),
  ),
  ...Array.filterMap(pcb.graphicArcs, (arc) =>
    arcFrom(
      arc.layer,
      arc.startPoint,
      arc.midPoint,
      arc.endPoint,
      identityTransform,
    ),
  ),
  ...Array.flatMap(onEdgeCutsLayer(pcb.graphicPolys), (poly) =>
    pointsPrimitives(poly.points, identityTransform, "poly"),
  ),
  ...Array.flatMap(onEdgeCutsLayer(pcb.graphicCurves), (curve) =>
    pointsPrimitives(curve.points, identityTransform, "curve"),
  ),
];

const collectFootprint = (
  footprint: Footprint,
): readonly EdgeCutPrimitive[] => {
  const transform = getFootprintTransform(footprint);
  return [
    ...Array.filterMap(footprint.fpLines, (line) =>
      segmentFrom(line.layer, line.start, line.end, transform),
    ),
    ...Array.filterMap(footprint.fpRects, (rect) =>
      rectFrom(rect.layer, rect.start, rect.end, transform),
    ),
    ...Array.filterMap(footprint.fpCircles, (circle) =>
      circleFrom(circle.layer, circle.center, circle.end, transform),
    ),
    ...Array.filterMap(footprint.fpArcs, (arc) =>
      arcFrom(arc.layer, arc.start, arc.mid, arc.end, transform),
    ),
    ...Array.flatMap(onEdgeCutsLayer(footprint.fpPolys), (poly) =>
      pointsPrimitives(poly.points, transform, "poly"),
    ),
    ...Array.flatMap(onEdgeCutsLayer(footprint.fpCurves), (curve) =>
      pointsPrimitives(curve.points, transform, "curve"),
    ),
  ];
};

export const collectEdgeCutPrimitives = (pcb: KicadPcb): EdgeCutPrimitive[] => [
  ...collectGraphics(pcb),
  ...Array.flatMap(pcb.footprints, collectFootprint),
];

const pointsPrimitives = (
  pts: Pts | undefined,
  transform: PointTransform,
  kind: "poly" | "curve",
): readonly EdgeCutPrimitive[] => {
  if (!pts) return [];

  const arcs = Array.filterMap(pts.points, (point) =>
    point instanceof PtsArc && point.start && point.mid && point.end
      ? Result.succeed<EdgeCutArc>({
          kind: "arc",
          start: transform({ x: point.start.x, y: point.start.y }),
          mid: transform({ x: point.mid.x, y: point.mid.y }),
          end: transform({ x: point.end.x, y: point.end.y }),
        })
      : Result.fail(null),
  );

  const straight = Array.filterMap(pts.points, (point) =>
    point instanceof PtsArc
      ? Result.fail(null)
      : Result.succeed(transform({ x: point.x, y: point.y })),
  );

  const container: readonly EdgeCutPrimitive[] =
    straight.length > 0
      ? [
          kind === "poly"
            ? { kind: "poly", points: straight }
            : { kind: "curve", controlPoints: straight },
        ]
      : [];

  return [...arcs, ...container];
};
