import type { ConfigFile } from "@/config/schema";
import { resolveFrom } from "./paths";
import type {
	CncSettingOptions,
	CncToolOptions,
	Range,
	ResolvedConfig,
} from "./types";

class ConfigValidationError extends Error {
	constructor(readonly errors: readonly string[]) {
		super(
			`Invalid flatmaxxing config:\n${errors.map((e) => `- ${e}`).join("\n")}`,
		);
		this.name = "ConfigValidationError";
	}
}

const assertRangeShape = (
	range: Range,
	path: string,
	errors: string[],
): void => {
	if (!Number.isFinite(range.min)) {
		errors.push(`${path}.min must be finite.`);
	}
	if (!Number.isFinite(range.max)) {
		errors.push(`${path}.max must be finite.`);
	}
	if (range.min > range.max) {
		errors.push(`${path}.min must be less than or equal to ${path}.max.`);
	}
};

const assertInRange = (
	value: number,
	range: Range,
	path: string,
	errors: string[],
): void => {
	if (!Number.isFinite(value)) {
		errors.push(`${path} must be finite.`);
		return;
	}

	if (value < range.min || value > range.max) {
		errors.push(`${path} must be between ${range.min} and ${range.max}.`);
	}
};

const validateTool = (
	tool: CncToolOptions | undefined,
	ranges: ResolvedConfig["validation"]["ranges"],
	path: string,
	errors: string[],
): void => {
	if (!tool) {
		return;
	}

	assertInRange(
		tool.diameter,
		ranges.toolDiameterMm,
		`${path}.diameter`,
		errors,
	);

	if (tool.type === "vbit") {
		assertInRange(tool.angle, ranges.angleDegrees, `${path}.angle`, errors);
	}
};

const validateCncSetting = (
	setting: CncSettingOptions | undefined,
	ranges: ResolvedConfig["validation"]["ranges"],
	path: string,
	errors: string[],
): void => {
	if (!setting) {
		return;
	}

	assertInRange(setting.feedRate, ranges.feedRate, `${path}.feedRate`, errors);
	assertInRange(
		setting.spindleSpeed,
		ranges.spindleSpeed,
		`${path}.spindleSpeed`,
		errors,
	);
	assertInRange(
		setting.zCutDepth,
		ranges.cutDepthMm,
		`${path}.zCutDepth`,
		errors,
	);
	assertInRange(
		setting.zCutFeedRate,
		ranges.feedRate,
		`${path}.zCutFeedRate`,
		errors,
	);
	validateTool(setting.tool, ranges, `${path}.tool`, errors);
};

export const validateResolvedConfig = (config: ResolvedConfig): void => {
	const errors: string[] = [];
	const { ranges } = config.validation;

	for (const [key, range] of Object.entries(ranges)) {
		assertRangeShape(range, `validation.ranges.${key}`, errors);
	}

	assertInRange(
		config.alignmentDrills.distance.x,
		ranges.distanceMm,
		"alignmentDrills.distance.x",
		errors,
	);
	assertInRange(
		config.alignmentDrills.distance.y,
		ranges.distanceMm,
		"alignmentDrills.distance.y",
		errors,
	);

	for (const edge of ["left", "right", "top", "bottom"] as const) {
		assertInRange(
			config.electroplating.additionalDistance[edge],
			ranges.distanceMm,
			`electroplating.additionalDistance.${edge}`,
			errors,
		);
	}

	assertInRange(
		config.solderMask.distance.x,
		ranges.distanceMm,
		"solderMask.distance.x",
		errors,
	);
	assertInRange(
		config.solderMask.distance.y,
		ranges.distanceMm,
		"solderMask.distance.y",
		errors,
	);
	assertInRange(
		config.solderMask.xtool.intensity,
		ranges.xtoolPercent,
		"solderMask.xtool.intensity",
		errors,
	);
	assertInRange(
		config.solderMask.xtool.passes,
		ranges.xtoolPasses,
		"solderMask.xtool.passes",
		errors,
	);
	assertInRange(
		config.stencil.xtool.power,
		ranges.xtoolPercent,
		"stencil.xtool.power",
		errors,
	);
	assertInRange(
		config.stencil.xtool.speed,
		ranges.xtoolSpeed,
		"stencil.xtool.speed",
		errors,
	);
	assertInRange(
		config.stencil.xtool.passes,
		ranges.xtoolPasses,
		"stencil.xtool.passes",
		errors,
	);

	validateCncSetting(config.cnc.isolation, ranges, "cnc.isolation", errors);
	validateCncSetting(
		config.cnc.nonCopperClearing,
		ranges,
		"cnc.nonCopperClearing",
		errors,
	);

	config.cnc.availableDrills?.forEach((drill, index) =>
		assertInRange(
			drill.diameter,
			ranges.toolDiameterMm,
			`cnc.availableDrills.${index}.diameter`,
			errors,
		),
	);
	config.cnc.availableMills?.forEach((mill, index) =>
		assertInRange(
			mill.diameter,
			ranges.toolDiameterMm,
			`cnc.availableMills.${index}.diameter`,
			errors,
		),
	);

	if (errors.length > 0) {
		throw new ConfigValidationError(errors);
	}
};

export const normalizeConfig = (
	config: ConfigFile,
	projectRoot: string,
): ResolvedConfig => {
	const resolvedProjectRoot = resolveFrom(process.cwd(), projectRoot);
	const resolved: ResolvedConfig = {
		dependencies: config.dependencies,
		paths: {
			additionalProjects: resolveFrom(
				resolvedProjectRoot,
				config.paths.additionalProjects,
			),
			gcode: resolveFrom(resolvedProjectRoot, config.paths.gcode),
			svg: resolveFrom(resolvedProjectRoot, config.paths.svg),
			dxf: resolveFrom(resolvedProjectRoot, config.paths.dxf),
			png: resolveFrom(resolvedProjectRoot, config.paths.png),
			gerbers: resolveFrom(resolvedProjectRoot, config.paths.gerbers),
			xtool: resolveFrom(resolvedProjectRoot, config.paths.xtool),
			place: resolveFrom(resolvedProjectRoot, config.paths.place),
		},
		board: {
			...config.board,
			file: config.board.file
				? resolveFrom(resolvedProjectRoot, config.board.file)
				: undefined,
		},
		alignmentDrills: config.alignmentDrills,
		electroplating: config.electroplating,
		solderMask: config.solderMask,
		stencil: config.stencil,
		drills: config.drills,
		place: config.place,
		cnc: config.cnc,
		xtool: config.xtool,
		validation: config.validation,
	};

	validateResolvedConfig(resolved);
	return resolved;
};
