import type { ISplineEntity } from "dxf-parser";
import { addPoint } from "./addPoint";
import type { Box } from "./types";

/**
 * Adds a SPLINE to the box using a conservative convex-hull bound: every
 * B-spline / NURBS curve stays within the convex hull of its control points, so
 * including the control points (and any fit points, which lie on the curve)
 * never underestimates the extent. This is the safe direction here, where the
 * bounds position artwork and must not come out too small.
 */
export function addSpline(box: Box, spline: ISplineEntity) {
	for (const point of spline.controlPoints ?? []) {
		addPoint(box, point);
	}

	for (const point of spline.fitPoints ?? []) {
		addPoint(box, point);
	}
}
