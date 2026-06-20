import type { Box, Coordinate } from "./types";

export function addPoint(box: Box, point: Coordinate | undefined) {
	if (!point) return;

	const { x, y } = point;
	if (!Number.isFinite(x) || !Number.isFinite(y)) return;

	box.minX = Math.min(box.minX, x);
	box.minY = Math.min(box.minY, y);
	box.maxX = Math.max(box.maxX, x);
	box.maxY = Math.max(box.maxY, y);
}
