export type Coordinate = {
	readonly x: number;
	readonly y: number;
};

export type PathCmd =
	| { readonly kind: "line"; readonly to: Coordinate }
	| {
			readonly kind: "arc";
			readonly to: Coordinate;
			readonly center: Coordinate;
			readonly cw: boolean;
	  };

export interface GerberOutlineOptions {
	readonly apertureDiaMm?: number;
}

const DEFAULT_APERTURE_DIA_MM = 0.2;

const toFixed46 = (mm: number): string => Math.round(mm * 1e6).toString();

const formatApertureDia = (mm: number): string => mm.toFixed(6);

const coordinate = (point: Coordinate): string =>
	`X${toFixed46(point.x)}Y${toFixed46(point.y)}`;

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

	lines.push(`${coordinate(start)}D02*`);

	let current = start;
	for (const cmd of cmds) {
		if (cmd.kind === "line") {
			lines.push("G01*");
			lines.push(`${coordinate(cmd.to)}D01*`);
		} else {
			const i = toFixed46(cmd.center.x - current.x);
			const j = toFixed46(cmd.center.y - current.y);
			lines.push("G75*");
			lines.push(cmd.cw ? "G02*" : "G03*");
			lines.push(`${coordinate(cmd.to)}I${i}J${j}D01*`);
		}
		current = cmd.to;
	}

	lines.push("M02*");
	return `${lines.join("\n")}\n`;
};
