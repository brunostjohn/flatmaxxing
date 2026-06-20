import { addPoint } from "./addPoint";
import type { Box, Coordinate } from "./types";

export function addFullEllipse(
	box: Box,
	center: Coordinate,
	major: Coordinate,
	minor: Coordinate,
) {
	const xExtent = Math.hypot(major.x, minor.x);
	const yExtent = Math.hypot(major.y, minor.y);

	addPoint(box, { x: center.x - xExtent, y: center.y - yExtent });
	addPoint(box, { x: center.x + xExtent, y: center.y + yExtent });
}
