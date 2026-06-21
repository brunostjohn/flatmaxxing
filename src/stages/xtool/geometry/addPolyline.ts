import { addBulgeArc } from "./addBulgeArc";
import { addPoint } from "./addPoint";
import type { Box, Coordinate } from "./types";

export type BulgeVertex = Coordinate & { bulge?: number };

/**
 * Adds an (LW)POLYLINE to the box, accounting for arc segments described by
 * per-vertex bulge values. A bulge lives on the start vertex of each segment;
 * a closed polyline additionally arcs from the last vertex back to the first.
 */
export function addPolyline(
	box: Box,
	vertices: readonly BulgeVertex[] | undefined,
	closed: boolean,
) {
	const points = vertices ?? [];

	for (const point of points) {
		addPoint(box, point);
	}

	for (let i = 0; i + 1 < points.length; i++) {
		const start = points[i];
		const end = points[i + 1];
		if (!start || !end) continue;
		addBulgeArc(box, start, end, start.bulge ?? 0);
	}

	if (closed && points.length > 1) {
		const last = points[points.length - 1];
		const first = points[0];
		if (last && first) {
			addBulgeArc(box, last, first, last.bulge ?? 0);
		}
	}
}
