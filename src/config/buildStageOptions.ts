import type {
	BoardSelectionOptions,
	BoardValidationOptions,
	KicadOutputOptions,
	ResolvedConfig,
	Side,
	XToolProjectOptions,
} from "./types";

const allSides = ["front", "back"] as const satisfies readonly Side[];

export const enabledSidesFromConfig = (
	config: ResolvedConfig,
): readonly Side[] =>
	config.board.ignoreSide === null
		? allSides
		: allSides.filter((side) => side !== config.board.ignoreSide);

const withoutExcludedSides = (
	sides: readonly Side[],
	excludeSides: readonly Side[],
): readonly Side[] => sides.filter((side) => !excludeSides.includes(side));

const workflowSkipReason = (
	generate: boolean,
	sides: readonly Side[],
	workflowName: "solderMask" | "stencil",
) => {
	if (!generate) {
		return `${workflowName}.generate=false`;
	}

	if (sides.length === 0) {
		return `${workflowName}.excludeSides excludes all enabled board sides`;
	}

	return undefined;
};

const sideSkipStatus = (
	boardSides: readonly Side[],
	excludeSides: readonly Side[],
	workflowName: "solderMask" | "stencil",
): Partial<Record<Side, string>> => {
	const statuses: Partial<Record<Side, string>> = {};

	for (const side of allSides) {
		if (!boardSides.includes(side)) {
			statuses[side] = `board.ignoreSide=${side}`;
			continue;
		}

		if (excludeSides.includes(side)) {
			statuses[side] = `${workflowName}.excludeSides includes ${side}`;
		}
	}

	return statuses;
};

export const buildBoardSelectionOptions = (
	config: ResolvedConfig,
): BoardSelectionOptions => ({
	boardFile: config.board.file,
});

export const buildBoardValidationOptions = (
	config: ResolvedConfig,
): BoardValidationOptions => ({
	autoFix: config.board.autoFix,
});

export const buildKicadOutputOptions = (
	config: ResolvedConfig,
): KicadOutputOptions => {
	const boardSides = enabledSidesFromConfig(config);
	const solderMaskSides = withoutExcludedSides(
		boardSides,
		config.solderMask.excludeSides,
	);
	const stencilSides = withoutExcludedSides(
		boardSides,
		config.stencil.excludeSides,
	);

	return {
		paths: {
			svg: config.paths.svg,
			dxf: config.paths.dxf,
			png: config.paths.png,
			gerbers: config.paths.gerbers,
			place: config.paths.place,
		},
		sides: boardSides,
		drills: config.drills,
		place: config.place,
		solderMask: {
			generate: config.solderMask.generate,
			sides: solderMaskSides,
			skipReason: workflowSkipReason(
				config.solderMask.generate,
				solderMaskSides,
				"solderMask",
			),
		},
		stencil: {
			generate: config.stencil.generate,
			sides: stencilSides,
			skipReason: workflowSkipReason(
				config.stencil.generate,
				stencilSides,
				"stencil",
			),
		},
	};
};

export const buildXToolProjectOptions = (
	config: ResolvedConfig,
): XToolProjectOptions => {
	const boardSides = enabledSidesFromConfig(config);
	const solderMaskSides = withoutExcludedSides(
		boardSides,
		config.solderMask.excludeSides,
	);
	const stencilSides = withoutExcludedSides(
		boardSides,
		config.stencil.excludeSides,
	);
	const solderMaskSkipReason = workflowSkipReason(
		config.solderMask.generate,
		solderMaskSides,
		"solderMask",
	);
	const stencilSkipReason = workflowSkipReason(
		config.stencil.generate,
		stencilSides,
		"stencil",
	);
	const solderMaskEnabled = solderMaskSkipReason === undefined;
	const stencilEnabled = stencilSkipReason === undefined;

	return {
		enabled: solderMaskEnabled || stencilEnabled,
		outputPath: config.paths.xtool,
		lifecycle: {
			appPath: config.xtool.appPath,
			cdpHost: config.xtool.cdpHost,
			cdpPort: config.xtool.cdpPort,
			window: config.xtool.window,
		},
		solderMask: {
			enabled: solderMaskEnabled,
			skipReason: solderMaskSkipReason,
			sides: solderMaskSides,
			sideSkipStatus: sideSkipStatus(
				boardSides,
				config.solderMask.excludeSides,
				"solderMask",
			),
			double: config.solderMask.double,
			distance: config.solderMask.distance,
			xtool: config.solderMask.xtool,
		},
		stencil: {
			enabled: stencilEnabled,
			skipReason: stencilSkipReason,
			sides: stencilSides,
			sideSkipStatus: sideSkipStatus(
				boardSides,
				config.stencil.excludeSides,
				"stencil",
			),
			xtool: config.stencil.xtool,
		},
	};
};
