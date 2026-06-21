/**
 * Post-processing for FlatCAM `.nc` output → a single Carvera-ready program.
 *
 * FlatCAM emits one self-contained MACH3-style file per `cncjob` (own header,
 * `M03 S…` … `M05`, park moves). We strip each down to its motion body and
 * reassemble per side: one clean Carvera preamble, the tool sections in order
 * with `M6 T<n>` toolchanges (Carvera's manual-change + TLO re-probe), a single
 * spindle stop/park at the end. This also sidesteps the guide's `T<n>\nM6`
 * newline bug — we generate toolchange lines ourselves.
 */

const SPINDLE_ON = /^M0?3\b/;
const SPINDLE_OFF = /^M0?5\b/;

/**
 * Returns the motion lines of a FlatCAM `.nc` — everything strictly between the
 * spindle-on (`M03`) and spindle-off (`M05`), with blank lines dropped. These
 * lines already include the tool's own plunge/retract moves to travel Z.
 */
export const extractToolpathBody = (gcode: string): string[] => {
	const lines = gcode.split(/\r?\n/).map((l) => l.trimEnd());
	const startIdx = lines.findIndex((l) => SPINDLE_ON.test(l.trim()));
	if (startIdx < 0) return [];
	const endIdx = lines.findIndex(
		(l, i) => i > startIdx && SPINDLE_OFF.test(l.trim()),
	);
	const end = endIdx < 0 ? lines.length : endIdx;
	return lines.slice(startIdx + 1, end).filter((l) => l.trim().length > 0);
};

export interface ToolSection {
	/** Physical tool number for `M6 T<n>`. */
	readonly toolNumber: number;
	/** Human label shown in the toolchange message (e.g. "0.198mm V-bit"). */
	readonly label: string;
	readonly spindleSpeed: number;
	/** Z to drop to after the toolchange before the body's first rapid. */
	readonly travelZ: number;
	/** Motion lines (from one or more cncjobs sharing this physical tool). */
	readonly body: readonly string[];
}

export interface AssembleOptions {
	/** Retract height before each toolchange / at job end. */
	readonly seamZ: number;
	readonly endZ: number;
	/** Comment lines for the file header (without parentheses). */
	readonly headerComments: readonly string[];
}

const fmtZ = (z: number): string => z.toFixed(4);

/**
 * Assembles ordered tool sections into one Carvera program. Sections must
 * already be grouped by physical tool (so the V-bit's NCC-finish and isolation
 * are one section → a single mount).
 */
export const assembleCarveraGcode = (
	sections: readonly ToolSection[],
	options: AssembleOptions,
): string => {
	const out: string[] = [];

	for (const comment of options.headerComments) {
		out.push(`(${comment})`);
	}
	out.push("");
	// G21 mm, G90 absolute, G94 units/min — Carvera defaults, forced for safety
	// (G20 would halt the machine).
	out.push("G21", "G90", "G94");
	out.push(`G00 Z${fmtZ(options.endZ)}`);

	for (const section of sections) {
		out.push("");
		out.push("M5");
		out.push(`G00 Z${fmtZ(options.seamZ)}`);
		out.push(`M6 T${section.toolNumber}`);
		out.push(`(MSG, Change to ${section.label})`);
		out.push(`M3 S${section.spindleSpeed}`);
		out.push(`G00 Z${fmtZ(section.travelZ)}`);
		for (const line of section.body) {
			out.push(line);
		}
		out.push(`G00 Z${fmtZ(options.seamZ)}`);
	}

	out.push("");
	out.push("M5");
	out.push(`G00 Z${fmtZ(options.endZ)}`);
	out.push("G00 X0.0000 Y0.0000");
	out.push("M30");
	out.push("");

	return out.join("\n");
};
