import { Array, Result } from "effect";
import { addPoint } from "./addPoint";
import { CARDINAL_ANGLES, GEOMETRY_EPSILON } from "./constants";
import { counterClockwiseSweep } from "./counterClockwiseSweep";
import { isAngleOnCounterClockwiseArc } from "./isAngleOnCounterClockwiseArc";
import { normalizeAngle } from "./normalizeAngle";
import { pointOnCircle } from "./pointOnCircle";
import type { Box, Coordinate } from "./types";

export const addBulgeArc = (
  box: Box,
  start: Coordinate,
  end: Coordinate,
  bulge: number,
) => {
  addPoint(box, start);
  addPoint(box, end);

  if (!Number.isFinite(bulge) || Math.abs(bulge) < GEOMETRY_EPSILON) return;

  const chord = Math.hypot(end.x - start.x, end.y - start.y);
  if (chord < GEOMETRY_EPSILON) return;

  const theta = 4 * Math.atan(bulge);
  const radius = chord / 2 / Math.sin(theta / 2);

  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const dirX = (end.x - start.x) / chord;
  const dirY = (end.y - start.y) / chord;
  const apothem = radius * Math.cos(theta / 2);
  const center = { x: midX - dirY * apothem, y: midY + dirX * apothem };

  const r = Math.abs(radius);
  const startAngle = normalizeAngle(
    Math.atan2(start.y - center.y, start.x - center.x),
  );
  const endAngle = normalizeAngle(
    Math.atan2(end.y - center.y, end.x - center.x),
  );

  const [from, to] =
    bulge > 0 ? [startAngle, endAngle] : [endAngle, startAngle];
  const sweep = counterClockwiseSweep(from, to);

  Array.forEach(
    Array.filterMap(CARDINAL_ANGLES, (angle) =>
      isAngleOnCounterClockwiseArc(angle, from, sweep)
        ? Result.succeed(pointOnCircle(center, r, angle))
        : Result.fail(null),
    ),
    (point) => addPoint(box, point),
  );
};
