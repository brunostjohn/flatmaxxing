import { GEOMETRY_EPSILON } from "./constants";
import { counterClockwiseDistance } from "./counterClockwiseDistance";
import { normalizeAngle } from "./normalizeAngle";

export function isAngleOnCounterClockwiseArc(
	angle: number,
	startAngle: number,
	sweep: number,
) {
	return (
		counterClockwiseDistance(startAngle, normalizeAngle(angle)) <=
		sweep + GEOMETRY_EPSILON
	);
}
