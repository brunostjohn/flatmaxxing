import { renderExcellon } from "@/stages/categorizeDrills/renderExcellon";

export interface BoardBounds {
	readonly xmin: number;
	readonly ymin: number;
	readonly xmax: number;
	readonly ymax: number;
}

export interface DrillPoint {
	readonly x: number;
	readonly y: number;
}

/**
 * The four registration drill positions: one per board corner, offset outward
 * by `distance` on each axis. The pattern is symmetric about the board centre,
 * so its centre coincides with the board bounding-box centre — which is exactly
 * the axis the back copper is mirrored about (`mirror -box <outline>`). That is
 * what keeps the flipped board registered on the dowel pins.
 */
export const alignmentDrillPoints = (
	bounds: BoardBounds,
	distance: { readonly x: number; readonly y: number },
): readonly DrillPoint[] => {
	const { xmin, ymin, xmax, ymax } = bounds;
	const dx = distance.x;
	const dy = distance.y;
	return [
		{ x: xmin - dx, y: ymin - dy },
		{ x: xmax + dx, y: ymin - dy },
		{ x: xmin - dx, y: ymax + dy },
		{ x: xmax + dx, y: ymax + dy },
	];
};

/**
 * A minimal absolute-metric decimal Excellon file with a single tool. Written
 * directly (FlatCAM's `export_excellon` Tcl command is broken in this build) so
 * the registration holes can be drilled in the same coordinate system as the
 * copper gerbers. Delegates to the shared {@link renderExcellon} writer.
 */
export const renderAlignmentExcellon = (
	points: readonly DrillPoint[],
	diameter: number,
): string =>
	renderExcellon(
		points.map((p) => ({
			kind: "circle",
			plating: "unknown",
			diameter,
			x: p.x,
			y: p.y,
			tool: 1,
		})),
	);
