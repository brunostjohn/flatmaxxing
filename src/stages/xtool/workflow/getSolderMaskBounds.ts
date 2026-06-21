import { dxfBounds } from "@/compute";
import DxfParser from "dxf-parser";
import { Effect, FileSystem } from "effect";
import { resolve } from "node:path";
import { solderMaskSideConfig } from "./solderMaskSideConfig";
import type { SolderMaskSide, XToolTasks } from "./types";

export const getSolderMaskBounds = Effect.fn(
	"flatmaxx.xtool.getSolderMaskBounds",
)(function* (
	projectPath: string,
	pcbName: string,
	side: SolderMaskSide,
	tasks: XToolTasks,
) {
	const fs = yield* FileSystem.FileSystem;
	const config = solderMaskSideConfig[side];
	const paths = config.taskPaths;
	const dxfPath = resolve(
		projectPath,
		"..",
		"dxf",
		`${pcbName}-${config.fileSuffix}.dxf`,
	);

	const dxfFile = yield* tasks.runTask({
		path: paths.readDxf,
		effect: fs.readFileString(dxfPath),
		loading: { status: `Reading ${config.fileSuffix} DXF from disk...` },
		success: { label: `${config.fileSuffix} DXF read.` },
	});

	const dxf = yield* tasks.runTask({
		path: paths.parseDxf,
		effect: Effect.gen(function* () {
			const parser = new DxfParser();
			const parsed = parser.parseSync(dxfFile);
			if (!parsed) {
				return yield* Effect.fail(new Error("Failed to parse DXF file."));
			}
			return parsed;
		}),
		loading: { status: `Parsing ${config.fileSuffix} DXF entities...` },
		success: { label: `${config.fileSuffix} DXF parsed.` },
		error: { status: `Failed to parse ${config.fileSuffix} DXF file.` },
	});

	return yield* tasks.runTask({
		path: paths.measureBounds,
		// Runs the bounds math (incl. spline Bézier extrema) in a Bun worker.
		effect: dxfBounds(dxf),
		loading: { status: `Measuring ${config.fileSuffix} geometry bounds...` },
		success: { label: `Measured ${config.label} solder mask bounds.` },
	});
});
