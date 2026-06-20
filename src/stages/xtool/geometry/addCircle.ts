import { addPoint } from "./addPoint";
import type { Box, Coordinate } from "./types";

export function addCircle(
	box: Box,
	center: Coordinate | undefined,
	radius: number,
) {
	if (!center || !Number.isFinite(radius)) return;

	const r = Math.abs(radius);
	addPoint(box, { x: center.x - r, y: center.y - r });
	addPoint(box, { x: center.x + r, y: center.y + r });
}
