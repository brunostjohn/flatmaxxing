import { normalizeAngle } from "./normalizeAngle";

export function counterClockwiseDistance(from: number, to: number) {
	return normalizeAngle(to - from);
}
