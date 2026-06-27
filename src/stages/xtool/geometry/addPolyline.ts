import { Array, Option } from "effect";
import { addBulgeArc } from "./addBulgeArc";
import { addPoint } from "./addPoint";
import type { Box, Coordinate } from "./types";

export type BulgeVertex = Coordinate & { bulge?: number };

interface BulgeSegment {
  readonly start: BulgeVertex;
  readonly end: BulgeVertex;
}

const closingSegment = (
  points: readonly BulgeVertex[],
  closed: boolean,
): Option.Option<BulgeSegment> =>
  Option.all([Array.last(points), Array.head(points)]).pipe(
    Option.filter(() => closed && points.length > 1),
    Option.map(([last, first]) => ({ start: last, end: first })),
  );

export const addPolyline = (
  box: Box,
  vertices: readonly BulgeVertex[] | undefined,
  closed: boolean,
) => {
  const points = vertices ?? [];

  Array.forEach(points, (point) => addPoint(box, point));

  const openSegments = Array.zipWith(
    points,
    Array.drop(points, 1),
    (start, end): BulgeSegment => ({ start, end }),
  );

  const segments = Array.appendAll(
    openSegments,
    Option.toArray(closingSegment(points, closed)),
  );

  Array.forEach(segments, ({ start, end }) =>
    addBulgeArc(box, start, end, start.bulge ?? 0),
  );
};
