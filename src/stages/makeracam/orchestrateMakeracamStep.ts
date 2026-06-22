import { Effect, FileSystem } from "effect";
import { basename, join } from "node:path";
import {
	assertExportRowCount,
	calculatePath,
	chooseToolByDiameter,
	closeToolpathDialog,
	deleteDefaultPocketTool,
	exportGcode,
	importPcbFile,
	newProject3Axis,
	openToolpath,
	reorderContourLast,
	saveAllPaths,
	saveProjectMkc,
	selectLayerGraphics,
	setContourOutsideTabs,
	setEndDepth,
	setStockMaterialPCB,
	setSequentialToolNumbers,
} from "./actions";
import { type LifecycleReport, withMakeraCamSession } from "./lifecycle";
import { selectStepDrills } from "./selectStepDrills";
import type {
	MakeracamStepOptions,
	PlannedToolpath,
	ToolpathKind,
} from "./types";

/** Step output basename (no extension) per the EXECUTION-PLAN naming. */
export const stepFilename = (
	board: string,
	step: "plated" | "final",
): string =>
	step === "plated"
		? `${board}_align-PTH_Holes-PTH_EdgeCuts`
		: `${board}_NPTH_Holes-Final_EdgeCuts`;

/** Map a categorized method to the toolpath dialog kind. */
const kindForMethod = (method: string): ToolpathKind =>
	method === "drills" ? "drill" : "pocket";

/**
 * Build the ordered toolpath plan for a step: the categorized drill/pocket
 * files (drills then pockets) followed by the generated edge-cut Gerber as the
 * final contour.
 */
export const planToolpaths = (
	files: readonly string[],
	board: string,
	step: "plated" | "final",
	drillsDir: string,
	edgeCutGerberPath: string,
): readonly PlannedToolpath[] => {
	const drills = selectStepDrills(files, board, step).map(
		(d): PlannedToolpath => ({
			file: d.file,
			absPath: join(drillsDir, d.file),
			kind: kindForMethod(d.method),
			category: d.category,
			method: d.method,
			diameterMm: d.diameterMm,
			// The actual layer title is resolved on import (by diff); this is a hint.
			layerTitle: d.file,
		}),
	);

	const contour: PlannedToolpath = {
		file: basename(edgeCutGerberPath),
		absPath: edgeCutGerberPath,
		kind: "contour",
		category: "edge",
		method: "contour",
		// Diameter unused for contour tool matching beyond magazine selection; the
		// contour uses a Corn Bit. The mill diameter is not encoded in the Gerber
		// name, so the orchestrator picks the configured contour mill below.
		// VERIFY: which mill diameter the edge-cut contour should use. The findings
		// don't pin a diameter; for v1 we leave 0 and the lead should wire the
		// configured contour-mill diameter through here.
		diameterMm: 0,
		layerTitle: basename(edgeCutGerberPath),
	};

	// Contour FIRST, then the drills/pockets. Two reasons: (1) MakeraCAM's Auto-tab
	// "Generate" only takes on a freshly-opened dialog — created as a later toolpath
	// (after several drills/pockets) it silently produces no tab geometry, so the
	// edge cut must be the first path built; (2) it's the correct machining order —
	// cut the tabbed outline first, then drill with the board still held by its tabs.
	return [contour, ...drills];
};

/**
 * Run one full MakeraCAM machining step end-to-end against a fresh session:
 * import each planned file, build its toolpath, calculate, then save all paths,
 * renumber tools sequentially, export G-code and save the `.mkc` project.
 *
 * `contourMillDiameterMm` is the Corn Bit diameter used for the edge-cut
 * contour (the contour file name does not encode it).
 */
export const orchestrateMakeracamStep = Effect.fn(
	"flatmaxx.makeracam.orchestrateStep",
)(function* (
	options: MakeracamStepOptions,
	pcbName: string,
	edgeCutGerberPath: string,
	contourMillDiameterMm: number,
	report: LifecycleReport = () => Effect.void,
) {
	const fs = yield* FileSystem.FileSystem;

	// Build the plan from the on-disk drills listing.
	const listing = (yield* fs.readDirectory(options.drillsDir)).filter((f) =>
		f.toLowerCase().endsWith(".drl"),
	);
	const planned = planToolpaths(
		listing,
		pcbName,
		options.step,
		options.drillsDir,
		edgeCutGerberPath,
	);

	if (planned.length === 0) {
		return yield* Effect.fail(
			new Error(
				`No toolpaths planned for the ${options.step} step (no matching drills in ${options.drillsDir}).`,
			),
		);
	}

	const base = stepFilename(pcbName, options.step);
	// Final output paths.
	const gcodeFinal = join(options.gcodeDir, `${base}.gcode`);
	const mkcFinal = join(options.cncDir, `${base}.mkc`);
	// Atomic-ish staging: write to a temp name, rename on full success.
	// VERIFY: MakeraCAM writes directly via its save panels, so we cannot easily
	// stage to a temp path inside the app and rename afterward without confusing
	// the save panel. For v1 we export straight to the final path and rely on the
	// row-count + tool-number assertions to catch a partial export before the
	// files are written. True temp-then-rename would require post-export renames
	// (export to <base>.tmp.gcode, then fs.rename) — left as a follow-up.
	const gcodeTarget = gcodeFinal;
	const mkcTarget = mkcFinal;

	yield* fs.makeDirectory(options.gcodeDir, { recursive: true });
	yield* fs.makeDirectory(options.cncDir, { recursive: true });

	return yield* withMakeraCamSession(
		options,
		(session) =>
			Effect.gen(function* () {
				const pid = session.pid;

				yield* report("Creating a new 3-axis project...");
				yield* newProject3Axis(pid);

				yield* report("Setting stock material to PCB...");
				yield* setStockMaterialPCB(pid);

				for (let i = 0; i < planned.length; i++) {
					const tp = planned[i];
					if (tp === undefined) continue;
					yield* report(
						`Building toolpath ${i + 1}/${planned.length}: ${tp.file}...`,
					);

					// Import → get the actual new layer group title.
					const layerTitle = yield* importPcbFile(pid, tp.absPath);
					yield* selectLayerGraphics(pid, layerTitle);

					yield* openToolpath(pid, tp.kind);
					yield* setEndDepth(pid, tp.kind, options.cutDepthMm);

					if (tp.kind === "pocket") {
						// Delete the default tool first, then add the matched Corn Bit.
						yield* deleteDefaultPocketTool(pid);
						yield* chooseToolByDiameter(
							pid,
							tp.method,
							tp.diameterMm,
							"Add Tool",
						);
					} else if (tp.kind === "contour") {
						yield* chooseToolByDiameter(
							pid,
							"contour",
							contourMillDiameterMm,
							"Choose Tool",
						);
						yield* setContourOutsideTabs(
							pid,
							options.cutDepthMm,
							options.tabsPerContour,
						);
					} else {
						// drilling — single-tool Choose Tool.
						yield* chooseToolByDiameter(
							pid,
							tp.method,
							tp.diameterMm,
							"Choose Tool",
						);
					}

					yield* calculatePath(pid);
					yield* closeToolpathDialog(pid);
				}

				yield* report("Reordering — moving the edge-cut contour to last...");
				yield* reorderContourLast(pid);

				yield* report("Saving all paths → Export ToolPaths...");
				yield* saveAllPaths(pid);

				// Partial-failure guard: row count must equal the plan.
				yield* assertExportRowCount(pid, planned.length);

				yield* report("Assigning tool numbers (reusing repeated tools)...");
				// Number by UNIQUE physical tool (type + diameter) in first-seen
				// order, so a tool reused across ops keeps one number — e.g. a 1.5mm
				// corn mill shared by a pocket and the edge-cut contour.
				const toolKey = (tp: PlannedToolpath): string =>
					tp.kind === "drill"
						? `drill:${tp.diameterMm}`
						: `mill:${tp.kind === "contour" ? contourMillDiameterMm : tp.diameterMm}`;
				const seenTools = new Map<string, number>();
				// The contour is BUILT first but reorderContourLast moves it to the END,
				// so export rows are drills/pockets first, contour last. Number by that
				// FINAL order so each export row gets the right (reused) number.
				const finalOrder = [
					...planned.filter((tp) => tp.kind !== "contour"),
					...planned.filter((tp) => tp.kind === "contour"),
				];
				const desiredNumbers = finalOrder.map((tp) => {
					const k = toolKey(tp);
					let n = seenTools.get(k);
					if (n === undefined) {
						n = seenTools.size + 1;
						seenTools.set(k, n);
					}
					return n;
				});
				yield* setSequentialToolNumbers(pid, desiredNumbers);

				yield* report("Exporting G-code...");
				// Pre-clear the export targets so MakeraCAM never shows its "Replace?"
				// dialog (the save-panel automation can't dismiss it → 30s hang). The
				// G-code is written by MakeraCAM as "<target>.nc", so clear that variant
				// too. Mirrors the xtool stage's remove-before-save.
				const ncVariant = `${gcodeTarget}.nc`;
				yield* fs.remove(ncVariant, { force: true }).pipe(Effect.ignore);
				yield* fs.remove(gcodeTarget, { force: true }).pipe(Effect.ignore);
				yield* exportGcode(pid, gcodeTarget);
				// MakeraCAM appends ".nc" to the exported G-code name; rename to the
				// intended ".gcode" path (the user's naming convention).
				if (yield* fs.exists(ncVariant)) {
					yield* fs.remove(gcodeTarget).pipe(Effect.ignore);
					yield* fs.rename(ncVariant, gcodeTarget);
				}

				yield* report("Saving the MakeraCAM project (.mkc)...");
				// Same: remove any existing .mkc first so Save As doesn't hit "Replace?".
				yield* fs.remove(mkcTarget, { force: true }).pipe(Effect.ignore);
				yield* saveProjectMkc(pid, mkcTarget);

				return {
					gcodePath: gcodeFinal,
					mkcPath: mkcFinal,
					pathCount: planned.length,
				};
			}),
		report,
	);
});
