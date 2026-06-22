/**
 * A minimal RS-274X (extended Gerber) writer for a single CLOSED outline made of
 * line segments and circular arcs — exactly what MakeraCAM's "Import PCB" expects
 * for an edge-cut profile. Written by hand (KiCad's plotter isn't available here)
 * and modelled on KiCad 9's own `*-Edge_Cuts.gm1` output: `%FSLAX46Y46*%`,
 * `%MOMM*%`, a `Profile,NP` file function, a single circular aperture, then a
 * `D02` move to the start followed by `G01` line moves and `G75*`/`G02`/`G03`
 * arc moves, terminated by `M02*`.
 *
 * All coordinates are millimetres. Output uses 4.6 fixed-point format (the
 * integer written is `round(mm * 1e6)`), matching the `%FSLAX46Y46*%` header.
 */

export type Coordinate = {
	readonly x: number;
	readonly y: number;
};

/**
 * One step of the outline, expressed as the geometry that takes the pen from the
 * current point to `to`. An `arc` also carries its `center` and a `cw` winding
 * flag; the writer derives `G02` (clockwise) / `G03` (counter-clockwise) from
 * `cw` — winding is never hardcoded.
 */
export type PathCmd =
	| { readonly kind: "line"; readonly to: Coordinate }
	| {
			readonly kind: "arc";
			readonly to: Coordinate;
			readonly center: Coordinate;
			readonly cw: boolean;
	  };

export interface GerberOutlineOptions {
	/** Aperture diameter in mm (the profile "pen"). Defaults to KiCad's 0.2 mm. */
	readonly apertureDiaMm?: number;
}

const DEFAULT_APERTURE_DIA_MM = 0.2;

/** 4.6 fixed-point: the on-disk integer for a millimetre value. */
const toFixed46 = (mm: number): string => Math.round(mm * 1e6).toString();

/** A `%ADDnnC,d*%` aperture diameter — KiCad writes six decimal places. */
const formatApertureDia = (mm: number): string => mm.toFixed(6);

const coordinate = (point: Coordinate): string =>
	`X${toFixed46(point.x)}Y${toFixed46(point.y)}`;

/**
 * Render a closed outline (a single contour) to an RS-274X string. `start` is the
 * first vertex; each command in `cmds` continues from the previous point. For a
 * truly closed loop the final command's `to` should equal `start`.
 */
export const renderGerberOutline = (
	start: Coordinate,
	cmds: readonly PathCmd[],
	opts: GerberOutlineOptions = {},
): string => {
	const apertureDia = opts.apertureDiaMm ?? DEFAULT_APERTURE_DIA_MM;

	const lines: string[] = [
		"%FSLAX46Y46*%",
		"%MOMM*%",
		"G04 Created by flatmaxx*",
		"%TF.FileFunction,Profile,NP*%",
		"%LPD*%",
		"G01*",
		"%TA.AperFunction,Profile*%",
		`%ADD10C,${formatApertureDia(apertureDia)}*%`,
		"%TD*%",
		"D10*",
	];

	// Move (D02) to the contour start without exposing.
	lines.push(`${coordinate(start)}D02*`);

	let current = start;
	for (const cmd of cmds) {
		if (cmd.kind === "line") {
			lines.push("G01*");
			lines.push(`${coordinate(cmd.to)}D01*`);
		} else {
			// I/J are the arc-centre offset from the CURRENT point, in 4.6 fixed.
			const i = toFixed46(cmd.center.x - current.x);
			const j = toFixed46(cmd.center.y - current.y);
			// G75 = multi-quadrant arc mode; G02 = clockwise, G03 = counter-clockwise.
			lines.push("G75*");
			lines.push(cmd.cw ? "G02*" : "G03*");
			lines.push(`${coordinate(cmd.to)}I${i}J${j}D01*`);
		}
		current = cmd.to;
	}

	lines.push("M02*");
	return `${lines.join("\n")}\n`;
};
