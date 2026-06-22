/**
 * A minimal DXF (AutoCAD R12-style ASCII) writer for a single CLOSED outline made
 * of line segments and circular arcs — the clean vector geometry MakeraCAM's
 * importer handles correctly for an edge-cut profile.
 *
 * We switched the edge-cut import from RS-274X Gerber to DXF because MakeraCAM
 * mishandles stroked-profile Gerbers (the import seats oddly and Auto-tab
 * generation is unreliable on it). A DXF carries true centreline geometry —
 * LINE / ARC / CIRCLE entities — so the contour imports as a single clean path
 * MakeraCAM can tab.
 *
 * Reuses the same {@link Coordinate} / {@link PathCmd} model as the Gerber writer
 * (line | arc with `center` + `cw`). All coordinates are millimetres; a HEADER
 * sets `$INSUNITS = 4` (mm) so importers scale correctly.
 */
import type { Coordinate, PathCmd } from "./gerberWriter";

const f = (n: number): string => {
	// Trim to a stable, compact decimal (DXF group codes are free-form reals).
	const s = n.toFixed(6);
	return s.replace(/\.?0+$/, "") || "0";
};

/** One DXF group-code pair: code on its own line, value on the next. */
const pair = (code: number, value: string | number): string =>
	`${code}\n${value}\n`;

const lineEntity = (a: Coordinate, b: Coordinate): string =>
	pair(0, "LINE") +
	pair(8, "0") +
	pair(10, f(a.x)) +
	pair(20, f(a.y)) +
	pair(11, f(b.x)) +
	pair(21, f(b.y));

const deg = (rad: number): number => (rad * 180) / Math.PI;

const arcEntity = (
	from: Coordinate,
	to: Coordinate,
	center: Coordinate,
	cw: boolean,
): string => {
	const radius = Math.hypot(from.x - center.x, from.y - center.y);
	const aFrom = Math.atan2(from.y - center.y, from.x - center.x);
	const aTo = Math.atan2(to.y - center.y, to.x - center.x);
	// A DXF ARC is always drawn counter-clockwise from start angle to end angle.
	// For a clockwise sweep (cw) we therefore emit the arc reversed: CCW from `to`
	// back to `from` traces the same geometry as CW from `from` to `to`.
	const startDeg = deg(cw ? aTo : aFrom);
	const endDeg = deg(cw ? aFrom : aTo);
	return (
		pair(0, "ARC") +
		pair(8, "0") +
		pair(10, f(center.x)) +
		pair(20, f(center.y)) +
		pair(40, f(radius)) +
		pair(50, f(startDeg)) +
		pair(51, f(endDeg))
	);
};

/** A standalone full circle (e.g. an alignment hole), if ever needed. */
export const dxfCircle = (center: Coordinate, radiusMm: number): string =>
	pair(0, "CIRCLE") +
	pair(8, "0") +
	pair(10, f(center.x)) +
	pair(20, f(center.y)) +
	pair(40, f(radiusMm));

/**
 * Render a closed outline (`start` + continuation commands) plus any extra raw
 * entity strings (e.g. {@link dxfCircle}) into a complete DXF document.
 */
export const renderDxfOutline = (
	start: Coordinate,
	cmds: readonly PathCmd[],
	extraEntities: readonly string[] = [],
): string => {
	let cursor = start;
	let entities = "";
	for (const cmd of cmds) {
		entities +=
			cmd.kind === "line"
				? lineEntity(cursor, cmd.to)
				: arcEntity(cursor, cmd.to, cmd.center, cmd.cw);
		cursor = cmd.to;
	}
	for (const e of extraEntities) entities += e;

	return (
		pair(0, "SECTION") +
		pair(2, "HEADER") +
		pair(9, "$INSUNITS") +
		pair(70, 4) + // 4 = millimetres
		pair(0, "ENDSEC") +
		pair(0, "SECTION") +
		pair(2, "ENTITIES") +
		entities +
		pair(0, "ENDSEC") +
		pair(0, "EOF")
	);
};
