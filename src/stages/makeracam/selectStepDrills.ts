import type { MakeracamStep, ParsedDrillFilename } from "./types";

/**
 * Parse a categorized drill filename into its parts.
 *
 * Contract (see `categorizeHoles.ts`): `<board>_<category>-<method>-<dia>mm.drl`
 * where `category ∈ {PTH, NPTH, alignment}`, `method ∈ {drills, pockets}`, and
 * the board name itself may contain hyphens. We therefore split on the **last**
 * `_`: everything before it is the board, everything after is the
 * `<category>-<method>-<dia>mm` suffix.
 *
 * Returns `undefined` for any name that does not match the contract.
 */
export const parseDrillFilename = (
	name: string,
): ParsedDrillFilename | undefined => {
	if (!name.toLowerCase().endsWith(".drl")) return undefined;
	const stem = name.slice(0, name.length - ".drl".length);

	const lastUnderscore = stem.lastIndexOf("_");
	if (lastUnderscore <= 0) return undefined;

	const board = stem.slice(0, lastUnderscore);
	const suffix = stem.slice(lastUnderscore + 1);

	// suffix = <category>-<method>-<dia>mm — split from the right so the board
	// (already removed) can't interfere, and category never contains a hyphen.
	const match = suffix.match(/^([^-]+)-([^-]+)-([0-9]*\.?[0-9]+)mm$/);
	if (match === null) return undefined;

	const [, category, method, diaRaw] = match;
	if (category === undefined || method === undefined || diaRaw === undefined) {
		return undefined;
	}

	const diameterMm = Number.parseFloat(diaRaw);
	if (!Number.isFinite(diameterMm)) return undefined;

	return { board, category, method, diameterMm };
};

/** Categories that belong to each step. */
const STEP_CATEGORIES: Record<MakeracamStep, readonly string[]> = {
	// Step 1 (plated): alignment (any method — alignment may be a pocket!) + PTH.
	plated: ["alignment", "PTH"],
	// Step 2 (final): NPTH only.
	final: ["NPTH"],
};

export interface SelectedDrill extends ParsedDrillFilename {
	/** The matching source filename. */
	readonly file: string;
}

/**
 * The categorized drill/pocket files for a step, in build order: **drills
 * first, then pockets**, each group sorted by diameter ascending for
 * determinism. (The edge-cut contour is appended by the orchestrator, not here.)
 *
 * Plating = categories {alignment, PTH} regardless of method (the alignment
 * file is a pocket). Final = {NPTH}. Files for other boards are ignored.
 */
export const selectStepDrills = (
	files: readonly string[],
	board: string,
	step: MakeracamStep,
): readonly SelectedDrill[] => {
	const wanted = STEP_CATEGORIES[step];

	const selected: SelectedDrill[] = [];
	for (const file of files) {
		const parsed = parseDrillFilename(file);
		if (parsed === undefined) continue;
		if (parsed.board !== board) continue;
		if (!wanted.includes(parsed.category)) continue;
		selected.push({ ...parsed, file });
	}

	// Drills before pockets, then ascending diameter, then category for a stable
	// total order across platforms.
	const methodRank = (method: string): number => (method === "drills" ? 0 : 1);
	return selected.sort(
		(a, b) =>
			methodRank(a.method) - methodRank(b.method) ||
			a.diameterMm - b.diameterMm ||
			a.category.localeCompare(b.category),
	);
};

/**
 * Tool Magazine category for a method: drills live under "Drill", everything
 * pocketed (and the edge-cut contour) uses "Corn Bits".
 */
export const magazineCategoryFor = (method: string): "Drill" | "Corn Bits" =>
	method === "drills" ? "Drill" : "Corn Bits";
