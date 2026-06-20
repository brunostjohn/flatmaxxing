import { GEOMETRY_EPSILON } from "./constants";

export function snapNearZero(value: number) {
	return Math.abs(value) < GEOMETRY_EPSILON ? 0 : value;
}
