import type { IArcEntity } from "dxf-parser";
import { addCircle } from "./addCircle";
import { addPoint } from "./addPoint";
import { CARDINAL_ANGLES, GEOMETRY_EPSILON, TAU } from "./constants";
import { counterClockwiseSweep } from "./counterClockwiseSweep";
import { isAngleOnCounterClockwiseArc } from "./isAngleOnCounterClockwiseArc";
import { normalizeAngle } from "./normalizeAngle";
import { pointOnCircle } from "./pointOnCircle";
import type { Box } from "./types";

export function addArc(box: Box, arc: IArcEntity) {
	if (
		!arc.center ||
		!Number.isFinite(arc.radius) ||
		!Number.isFinite(arc.startAngle) ||
		!Number.isFinite(arc.endAngle)
	) {
		return;
	}

	const radius = Math.abs(arc.radius);
	const startAngle = normalizeAngle(arc.startAngle);
	const endAngle = normalizeAngle(arc.endAngle);
	const sweep = counterClockwiseSweep(arc.startAngle, arc.endAngle);

	if (sweep >= TAU - GEOMETRY_EPSILON) {
		addCircle(box, arc.center, radius);
		return;
	}

	addPoint(box, pointOnCircle(arc.center, radius, startAngle));
	addPoint(box, pointOnCircle(arc.center, radius, endAngle));

	for (const angle of CARDINAL_ANGLES) {
		if (isAngleOnCounterClockwiseArc(angle, startAngle, sweep)) {
			addPoint(box, pointOnCircle(arc.center, radius, angle));
		}
	}
}
