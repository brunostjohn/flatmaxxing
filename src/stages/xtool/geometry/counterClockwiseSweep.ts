import { GEOMETRY_EPSILON, TAU } from "./constants";
import { counterClockwiseDistance } from "./counterClockwiseDistance";
import { normalizeAngle } from "./normalizeAngle";

export function counterClockwiseSweep(startAngle: number, endAngle: number) {
	if (Math.abs(endAngle - startAngle) >= TAU - GEOMETRY_EPSILON) {
		return TAU;
	}

	return counterClockwiseDistance(
		normalizeAngle(startAngle),
		normalizeAngle(endAngle),
	);
}
