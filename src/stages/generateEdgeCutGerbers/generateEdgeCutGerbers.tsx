import { renderDxfOutline } from "@/geometry/dxfWriter";
import { nextStep, renderWaiting } from "@/inkHelpers";
import { findEdgeCutsBounds } from "@/stages/boardValidation/kicadBoardBounds";
import { alignmentDrillPoints } from "@/stages/generateCncJobs/alignmentDrills";
import { Effect, FileSystem } from "effect";
import { parseKicadPcb } from "kicadts";
import { basename, join } from "node:path";
import {
	collectEdgeCutsPrimitives,
	kicadToGerberTransform,
	transformOutline,
} from "./extractEdgeCutsOutline";
import { buildPlatingRoundedRect, type PlatingOffsets } from "./platingOutline";

export interface EdgeCutGerberOptions {
	readonly enabled: boolean;
	readonly platingOffsets: PlatingOffsets;
	readonly cornerRadius: number;
	readonly alignmentDistance: { readonly x: number; readonly y: number };
	readonly gerbersDir: string;
}

export const generateEdgeCutGerbers = Effect.fn(
	"flatmaxx.generateEdgeCutGerbers",
)(function* (pcbFile: string, options: EdgeCutGerberOptions) {
	if (!options.enabled) {
		const [success] = yield* renderWaiting({
			loading: "Edge-cut DXF generation...",
		});
		yield* success("Edge-cut DXF generation disabled — skipping.");
		return;
	}

	const fs = yield* FileSystem.FileSystem;
	const board = basename(pcbFile, ".kicad_pcb");

	const step = nextStep();
	const tag = (message: string): string => `Step ${step}: ${message}`;
	const [success, error, stop] = yield* renderWaiting({
		loading: tag("Generating edge-cut DXFs (plating + final outline)..."),
	});

	const source = yield* fs
		.readFileString(pcbFile)
		.pipe(Effect.tapError(() => stop));

	const built = yield* Effect.try({
		try: () => {
			const pcb = parseKicadPcb(source);
			const toGerber = kicadToGerberTransform(pcb);

			const finalOutline = transformOutline(
				collectEdgeCutsPrimitives(pcb),
				toGerber,
			);

			const bounds = findEdgeCutsBounds(pcb);
			const alignment = alignmentDrillPoints(
				{
					xmin: bounds.minX,
					ymin: bounds.minY,
					xmax: bounds.maxX,
					ymax: bounds.maxY,
				},
				options.alignmentDistance,
			);
			const platingOutline = transformOutline(
				buildPlatingRoundedRect(
					bounds,
					alignment,
					options.platingOffsets,
					options.cornerRadius,
				),
				toGerber,
			);

			return {
				platingDxf: renderDxfOutline(platingOutline.start, platingOutline.cmds),
				finalDxf: renderDxfOutline(finalOutline.start, finalOutline.cmds),
			};
		},
		catch: (cause) =>
			cause instanceof Error ? cause : new Error(String(cause)),
	}).pipe(
		Effect.tapError((cause) =>
			error(tag(`Edge-cut DXFs failed: ${cause.message}`)),
		),
	);

	yield* fs.makeDirectory(options.gerbersDir, { recursive: true });
	const platingPath = join(options.gerbersDir, `${board}-PTH_EdgeCuts.dxf`);
	const finalPath = join(options.gerbersDir, `${board}-Final_EdgeCuts.dxf`);

	yield* fs
		.writeFileString(platingPath, built.platingDxf)
		.pipe(Effect.tapError(() => stop));
	yield* fs
		.writeFileString(finalPath, built.finalDxf)
		.pipe(Effect.tapError(() => stop));

	yield* success(
		tag(
			`Wrote ${basename(platingPath)} + ${basename(finalPath)} to ${basename(options.gerbersDir)}/.`,
		),
	);
});
