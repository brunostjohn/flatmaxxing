import type { MakeracamStep, ParsedDrillFilename } from "./types";

export const parseDrillFilename = (
	name: string,
): ParsedDrillFilename | undefined => {
	if (!name.toLowerCase().endsWith(".drl")) return undefined;
	const stem = name.slice(0, name.length - ".drl".length);

	const lastUnderscore = stem.lastIndexOf("_");
	if (lastUnderscore <= 0) return undefined;

	const board = stem.slice(0, lastUnderscore);
	const suffix = stem.slice(lastUnderscore + 1);

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

const STEP_CATEGORIES: Record<MakeracamStep, readonly string[]> = {
	plated: ["alignment", "PTH"],
	final: ["NPTH"],
};

export interface SelectedDrill extends ParsedDrillFilename {
	readonly file: string;
}

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

	const methodRank = (method: string): number => (method === "drills" ? 0 : 1);
	return selected.sort(
		(a, b) =>
			methodRank(a.method) - methodRank(b.method) ||
			a.diameterMm - b.diameterMm ||
			a.category.localeCompare(b.category),
	);
};

export const magazineCategoryFor = (method: string): "Drill" | "Corn Bits" =>
	method === "drills" ? "Drill" : "Corn Bits";
