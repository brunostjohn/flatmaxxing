import { snapNearZero } from "./snapNearZero";
import type { Coordinate } from "./types";

export function pointOnCircle(
	center: Coordinate,
	radius: number,
	angle: number,
): Coordinate {
	return {
		x: snapNearZero(center.x + radius * Math.cos(angle)),
		y: snapNearZero(center.y + radius * Math.sin(angle)),
	};
}
