import { createTasklist, markTaskBranch, type TaskDef } from "@/inkHelpers";
import type { Side } from "@/config";
import { Effect, FileSystem } from "effect";
import { basename, join } from "node:path";
import {
	alignmentDrillPoints,
	type BoardBounds,
	renderAlignmentExcellon,
} from "./alignmentDrills";
import {
	buildFlatcamScript,
	isoNcName,
	nccNcName,
	type SideGerber,
} from "./buildFlatcamScript";
import type { CncJobOptions } from "./buildCncJobOptions";
import {
	assembleCarveraGcode,
	extractToolpathBody,
	type ToolSection,
} from "./ncGcode";
import { runFlatcam } from "./runFlatcam";

const cncTasks: TaskDef[] = [
	{
		id: "flatcam",
		label: "Running FlatCAM (isolation + non-copper clearing)...",
		state: "loading",
	},
	{ id: "drills", label: "Alignment drill Excellon...", state: "pending" },
	{
		id: "merge",
		label: "Assembling Carvera G-code...",
		state: "pending",
		children: [
			{ id: "front", label: "front", state: "pending" },
			{ id: "back", label: "back", state: "pending" },
		],
	},
];

const findGerber = (
	files: readonly string[],
	board: string,
	layer: string,
): string | undefined => files.find((f) => f.startsWith(`${board}-${layer}.`));

const parseBounds = (raw: string): BoardBounds => {
	const [xmin, ymin, xmax, ymax] = raw
		.trim()
		.split(/\s+/)
		.map((n) => Number.parseFloat(n));
	if (
		xmin === undefined ||
		ymin === undefined ||
		xmax === undefined ||
		ymax === undefined ||
		[xmin, ymin, xmax, ymax].some((v) => !Number.isFinite(v))
	) {
		throw new Error(`Could not parse board bounds from: "${raw}"`);
	}
	return { xmin, ymin, xmax, ymax };
};

/**
 * Step 4: turn the copper gerbers into Carvera-ready milling G-code.
 *
 * One headless FlatCAM run produces per-(side,tool) `.nc` files in a scratch dir
 * plus the board bounds; we then (a) write the alignment-drill Excellon into the
 * gerbers dir and (b) merge each side's tool files into a single Carvera program
 * with clean `M6 T<n>` toolchanges in the gcode dir — isolation first (V-bit),
 * then the full NCC sequence (mills biggest→smallest, then the V-bit again as the
 * fine finish, so the V-bit is loaded twice).
 */
export const generateCncJobs = Effect.fn("flatmaxx.generateCncJobs")(function* (
	flatcam: string,
	pcbFile: string,
	options: CncJobOptions,
) {
	const { setTaskOutput, patchTask, ...rest } = yield* createTasklist(
		cncTasks,
		"Step 4: Generate CNC jobs",
	);
	const taskControls = { setTaskOutput, patchTask, ...rest };

	if (!options.enabled) {
		yield* markTaskBranch(taskControls, cncTasks, "flatcam", {
			state: "success",
			label: "CNC generation skipped.",
			status: "no isolation tool configured",
		});
		yield* markTaskBranch(taskControls, cncTasks, "drills", {
			state: "success",
			label: "Alignment drills skipped.",
		});
		yield* markTaskBranch(taskControls, cncTasks, "merge", {
			state: "success",
			label: "G-code assembly skipped.",
			childStatus: "skipped",
		});
		return;
	}

	const fs = yield* FileSystem.FileSystem;
	const board = basename(pcbFile, ".kicad_pcb");

	const gerberFiles = yield* fs.readDirectory(options.gerbersDir);
	const edgeCuts = findGerber(gerberFiles, board, "Edge_Cuts");
	if (!edgeCuts) {
		yield* patchTask("flatcam", {
			state: "error",
			output: `No Edge_Cuts gerber found in ${options.gerbersDir}`,
		});
		return yield* Effect.fail(
			new Error(`Missing ${board}-Edge_Cuts.* in ${options.gerbersDir}`),
		);
	}

	const layerForSide: Record<Side, string> = {
		front: "F_Cu",
		back: "B_Cu",
	};
	const sideGerbers: SideGerber[] = [];
	for (const side of options.sides) {
		const copper = findGerber(gerberFiles, board, layerForSide[side]);
		if (copper) {
			sideGerbers.push({
				side,
				copperGerber: join(options.gerbersDir, copper),
			});
		}
	}

	const scratch = yield* fs.makeTempDirectoryScoped({
		prefix: "flatmaxx-cnc-",
	});
	const boundsFile = join(scratch, "bounds.txt");
	const shellFile = join(scratch, "job.tcl");
	const logFile = join(scratch, "flatcam.log");
	const doneFile = join(scratch, "done.flag");

	yield* fs.writeFileString(
		shellFile,
		buildFlatcamScript({
			sides: sideGerbers,
			edgeCutsGerber: join(options.gerbersDir, edgeCuts),
			mirrorAxis: options.mirrorAxis,
			plan: options.plan,
			scratchDir: scratch,
			boundsFile,
			doneFile,
		}),
	);

	yield* setTaskOutput(
		"flatcam",
		"isolation + clearing (this can take a while)",
	);
	yield* runFlatcam({
		flatcam,
		shellFile,
		logFile,
		doneFile,
		onProgress: (line) => setTaskOutput("flatcam", line),
	}).pipe(
		Effect.tapError((error) =>
			patchTask("flatcam", {
				state: "error",
				output: error instanceof Error ? error.message : String(error),
			}),
		),
	);
	yield* patchTask("flatcam", {
		state: "success",
		label: "FlatCAM finished.",
	});

	// ---- Alignment drills (only when the back is actually machined) ----
	const backMachined = yield* fs.exists(join(scratch, isoNcName("back")));
	if (options.alignmentDrills.generate && backMachined) {
		const bounds = parseBounds(yield* fs.readFileString(boundsFile));
		const points = alignmentDrillPoints(
			bounds,
			options.alignmentDrills.distance,
		);
		const drlPath = join(options.gerbersDir, `${board}-alignment.drl`);
		yield* fs.writeFileString(
			drlPath,
			renderAlignmentExcellon(points, options.alignmentDrills.diameter),
		);
		yield* patchTask("drills", {
			state: "success",
			label: `Wrote ${board}-alignment.drl (4 × ${options.alignmentDrills.diameter}mm).`,
		});
	} else {
		yield* patchTask("drills", {
			state: "success",
			label: "Alignment drills not needed (single-sided).",
		});
	}

	// ---- Merge per side into one Carvera program ----
	yield* fs.makeDirectory(options.gcodeDir, { recursive: true });
	yield* patchTask("merge", { state: "loading" });

	const assembleSide = Effect.fn("flatmaxx.generateCncJobs.assembleSide")(
		function* (side: Side) {
			const readBody = Effect.fn("readBody")(function* (name: string) {
				const path = join(scratch, name);
				if (!(yield* fs.exists(path))) return [];
				return extractToolpathBody(yield* fs.readFileString(path));
			});

			const sections: ToolSection[] = [];
			let toolNumber = 0;

			// 1) Isolation first, as its own V-bit operation.
			const isoBody = yield* readBody(isoNcName(side));
			if (isoBody.length > 0) {
				toolNumber += 1;
				sections.push({
					toolNumber,
					label: `${options.plan.isolation.label} (isolation)`,
					spindleSpeed: options.plan.isolation.spindleSpeed,
					travelZ: options.plan.clearance.travelZ,
					body: isoBody,
				});
			}

			// 2) Then NCC, all of its tools in clearing order (mills biggest→
			// smallest, then the V-bit again as the fine finish). Each tool that
			// produced a toolpath is its own section/toolchange — so the V-bit is
			// loaded twice (isolation, then NCC finish), which is expected.
			for (const tool of options.plan.ncc.tools) {
				const body = yield* readBody(nccNcName(side, tool.uid));
				if (body.length > 0) {
					toolNumber += 1;
					sections.push({
						toolNumber,
						label:
							tool.kind === "vbit" ? `${tool.label} (clearing)` : tool.label,
						spindleSpeed: tool.spindleSpeed,
						travelZ: options.plan.clearance.travelZ,
						body,
					});
				}
			}

			if (sections.length === 0) {
				yield* markTaskBranch(taskControls, cncTasks, ["merge", side], {
					state: "success",
					label: `${side} skipped (no copper).`,
				});
				return;
			}

			const gcode = assembleCarveraGcode(sections, {
				seamZ: options.plan.clearance.seamZ,
				endZ: options.plan.clearance.endZ,
				headerComments: [
					`flatmaxx CNC job — ${board} ${side}`,
					`Tools: ${sections.map((s) => `T${s.toolNumber}=${s.label}`).join(", ")}`,
					"Carvera-targeted; manual tool changes at M6 (TLO re-probe).",
				],
			});
			const outPath = join(options.gcodeDir, `${board}-${side}.nc`);
			yield* fs.writeFileString(outPath, gcode);
			yield* markTaskBranch(taskControls, cncTasks, ["merge", side], {
				state: "success",
				label: `${board}-${side}.nc (${sections.length} tool${sections.length === 1 ? "" : "s"}).`,
			});
		},
	);

	for (const side of ["front", "back"] as const) {
		if (options.sides.includes(side)) {
			yield* assembleSide(side);
		} else {
			yield* markTaskBranch(taskControls, cncTasks, ["merge", side], {
				state: "success",
				label: `${side} skipped (board.ignoreSide).`,
			});
		}
	}

	yield* patchTask("merge", {
		state: "success",
		label: "Assembled Carvera G-code.",
	});
}, Effect.scoped);
