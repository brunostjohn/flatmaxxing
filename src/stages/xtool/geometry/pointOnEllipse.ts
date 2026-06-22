import { snapNearZero } from "./snapNearZero";
import type { Coordinate } from "./types";

export function pointOnEllipse(
  center: Coordinate,
  major: Coordinate,
  minor: Coordinate,
  angle: number,
): Coordinate {
  return {
    x: snapNearZero(
      center.x + major.x * Math.cos(angle) + minor.x * Math.sin(angle),
    ),
    y: snapNearZero(
      center.y + major.y * Math.cos(angle) + minor.y * Math.sin(angle),
    ),
  };
}
