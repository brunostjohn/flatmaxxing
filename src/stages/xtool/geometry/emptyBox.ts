import type { Box } from "./types";

export function emptyBox(): Box {
	return {
		minX: Infinity,
		minY: Infinity,
		maxX: -Infinity,
		maxY: -Infinity,
	};
}
