import type { Coordinate, PathCmd } from "@/geometry/gerberWriter";
import type { Outline } from "./extractEdgeCutsOutline";

export interface PlatingBounds {
	readonly minX: number;
	readonly minY: number;
	readonly maxX: number;
	readonly maxY: number;
}

/** Asymmetric outward expansion (mm) applied per side before rounding corners. */
export interface PlatingOffsets {
	readonly left: number;
	readonly right: number;
	readonly top: number;
	readonly bottom: number;
}

/**
 * Build the plating edge-cut outline: a rounded rectangle that encloses the board
 * bounds AND every alignment-drill point, expanded outward asymmetrically by
 * `offsets`, with quarter-circle corners of radius `cornerRadius`.
 *
 * Coordinates are in KiCad board millimetres (Y grows downward, matching the
 * source bounds) — apply the Gerber transform afterwards. The loop is traced
 * counter-clockwise in this frame; after the Gerber Y-flip it becomes clockwise,
 * matching KiCad's own profile winding. The corner radius is clamped to half the
 * shorter side so the arcs never overlap.
 */
export const buildPlatingRoundedRect = (
	bounds: PlatingBounds,
	alignmentPoints: readonly Coordinate[],
	offsets: PlatingOffsets,
	cornerRadius: number,
): Outline => {
	let minX = bounds.minX;
	let minY = bounds.minY;
	let maxX = bounds.maxX;
	let maxY = bounds.maxY;

	// Union with every alignment point so the rounded rect always encloses the
	// registration holes (they sit outside the board bounds by design).
	for (const point of alignmentPoints) {
		minX = Math.min(minX, point.x);
		minY = Math.min(minY, point.y);
		maxX = Math.max(maxX, point.x);
		maxY = Math.max(maxY, point.y);
	}

	// Asymmetric outward expansion: left/right on X, top/bottom on Y.
	minX -= offsets.left;
	maxX += offsets.right;
	minY -= offsets.top;
	maxY += offsets.bottom;

	const width = maxX - minX;
	const height = maxY - minY;
	const radius = Math.max(0, Math.min(cornerRadius, width / 2, height / 2));

	if (radius <= 0) {
		// Degenerate radius: a plain rectangle (CCW).
		const start: Coordinate = { x: minX, y: minY };
		const cmds: PathCmd[] = [
			{ kind: "line", to: { x: maxX, y: minY } },
			{ kind: "line", to: { x: maxX, y: maxY } },
			{ kind: "line", to: { x: minX, y: maxY } },
			{ kind: "line", to: { x: minX, y: minY } },
		];
		return { start, cmds };
	}

	// Trace CCW starting on the bottom edge just right of the bottom-left arc.
	// Corner arc centres are inset by `radius` from each corner.
	const start: Coordinate = { x: minX + radius, y: minY };

	const cmds: PathCmd[] = [
		// Bottom edge, left -> right.
		{ kind: "line", to: { x: maxX - radius, y: minY } },
		// Bottom-right corner.
		{
			kind: "arc",
			to: { x: maxX, y: minY + radius },
			center: { x: maxX - radius, y: minY + radius },
			cw: false,
		},
		// Right edge, bottom -> top.
		{ kind: "line", to: { x: maxX, y: maxY - radius } },
		// Top-right corner.
		{
			kind: "arc",
			to: { x: maxX - radius, y: maxY },
			center: { x: maxX - radius, y: maxY - radius },
			cw: false,
		},
		// Top edge, right -> left.
		{ kind: "line", to: { x: minX + radius, y: maxY } },
		// Top-left corner.
		{
			kind: "arc",
			to: { x: minX, y: maxY - radius },
			center: { x: minX + radius, y: maxY - radius },
			cw: false,
		},
		// Left edge, top -> bottom.
		{ kind: "line", to: { x: minX, y: minY + radius } },
		// Bottom-left corner, back to start.
		{
			kind: "arc",
			to: { x: minX + radius, y: minY },
			center: { x: minX + radius, y: minY + radius },
			cw: false,
		},
	];

	return { start, cmds };
};
