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

/**
 * Options for the edge-cut DXF generator (subsystem C). The stage is skippable
 * via {@link enabled}; when enabled it writes two profile DXFs into
 * {@link gerbersDir} for MakeraCAM to import.
 */
export interface EdgeCutGerberOptions {
	/** When false, the stage renders a "skipped" line and consumes no step number. */
	readonly enabled: boolean;
	/** Asymmetric outward expansion (mm) for the plating rounded rect. */
	readonly platingOffsets: PlatingOffsets;
	/** Corner radius (mm) for the plating rounded rect (clamped to half-shorter-side). */
	readonly cornerRadius: number;
	/** Outward alignment-drill offset (mm) per axis, matching the CNC stage. */
	readonly alignmentDistance: { readonly x: number; readonly y: number };
	/** Directory the two `.dxf` files are written to. */
	readonly gerbersDir: string;
}

/**
 * Subsystem C: generate the two edge-cut profile DXFs MakeraCAM imports for final
 * machining. (DXF, not Gerber: MakeraCAM mishandles stroked-profile Gerbers — the
 * import seats oddly and Auto-tab generation is unreliable on it — whereas clean
 * DXF centreline geometry imports as a single contour it tabs correctly.)
 *
 * - `<board>-PTH_EdgeCuts.dxf` (plating step): a rounded rectangle enclosing the
 *   board bounds AND the four alignment-drill points, expanded by the configured
 *   per-side offsets.
 * - `<board>-Final_EdgeCuts.dxf` (final step): the board's TRUE outer Edge.Cuts
 *   OUTLINE only — the release cut. We extract the perimeter ourselves rather than
 *   using kicad-cli's DXF, because kicad-cli emits every Edge.Cuts primitive incl.
 *   internal holes/cutouts (which must NOT be milled on the release cut) and splits
 *   them across colour layers MakeraCAM imports separately.
 *
 * Both are placed by {@link kicadToGerberTransform} (aux-origin, Y-flipped) so they
 * seat on the same stock as the drill exports. Each is a single clean closed loop,
 * which MakeraCAM imports as one selectable contour and can Auto-tab. Tabs are NOT
 * part of the geometry — MakeraCAM adds them at import.
 */
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

			// --- Final outline: the board's TRUE outer Edge.Cuts perimeter, zero
			// offset. Outline only (no internal holes/cutouts). ---
			const finalOutline = transformOutline(
				collectEdgeCutsPrimitives(pcb),
				toGerber,
			);

			// --- Plating outline: rounded rect around board + alignment holes. ---
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
