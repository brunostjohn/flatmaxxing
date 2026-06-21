import { addPoint } from "./addPoint";
import { CARDINAL_ANGLES, GEOMETRY_EPSILON } from "./constants";
import { counterClockwiseSweep } from "./counterClockwiseSweep";
import { isAngleOnCounterClockwiseArc } from "./isAngleOnCounterClockwiseArc";
import { normalizeAngle } from "./normalizeAngle";
import { pointOnCircle } from "./pointOnCircle";
import type { Box, Coordinate } from "./types";

/**
 * Adds a polyline bulge segment to the box. A bulge is the tangent of one
 * quarter of the arc's included angle (`bulge = tan(θ/4)`), negative when the
 * arc runs clockwise from start to end. Mirrors {@link addArc}: it samples the
 * endpoints plus any cardinal angle (0°, 90°, 180°, 270°) lying on the arc.
 */
export function addBulgeArc(
	box: Box,
	start: Coordinate,
	end: Coordinate,
	bulge: number,
) {
	addPoint(box, start);
	addPoint(box, end);

	if (!Number.isFinite(bulge) || Math.abs(bulge) < GEOMETRY_EPSILON) return;

	const chord = Math.hypot(end.x - start.x, end.y - start.y);
	if (chord < GEOMETRY_EPSILON) return;

	const theta = 4 * Math.atan(bulge);
	const radius = chord / 2 / Math.sin(theta / 2);

	// The centre sits on the chord's perpendicular bisector, offset from the
	// chord midpoint along its left normal by the (signed) apothem.
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

	// Canonicalise to a counter-clockwise sweep so the existing arc helpers
	// apply: a positive bulge runs CCW from start to end, a negative one runs
	// CW (i.e. CCW from end to start).
	const [from, to] =
		bulge > 0 ? [startAngle, endAngle] : [endAngle, startAngle];
	const sweep = counterClockwiseSweep(from, to);

	for (const angle of CARDINAL_ANGLES) {
		if (isAngleOnCounterClockwiseArc(angle, from, sweep)) {
			addPoint(box, pointOnCircle(center, r, angle));
		}
	}
}
