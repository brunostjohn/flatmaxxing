import { normalizeAngle } from "./normalizeAngle";
import type { Coordinate } from "./types";

export function ellipseCardinalAngles(
  major: Coordinate,
  minor: Coordinate,
): number[] {
  const xExtreme = Math.atan2(minor.x, major.x);
  const yExtreme = Math.atan2(minor.y, major.y);

  return [
    normalizeAngle(xExtreme),
    normalizeAngle(xExtreme + Math.PI),
    normalizeAngle(yExtreme),
    normalizeAngle(yExtreme + Math.PI),
  ];
}
