import { addPoint } from "./addPoint";
import type { Box, Coordinate } from "./types";

export function addVertices(
	box: Box,
	vertices: readonly Coordinate[] | undefined,
) {
	for (const point of vertices ?? []) {
		addPoint(box, point);
	}
}
