import { formatDia } from "@/cnc/cncJobPlan";
import type {
	AlignmentDrillCategorizationOptions,
	DrillCategorizationOptions,
} from "@/config";
import { nextStep, renderOnce, renderWaiting } from "@/inkHelpers";
import { Alert } from "@inkjs/ui";
import { Effect, FileSystem } from "effect";
import { Box, Text } from "ink";
import { basename, dirname, join } from "node:path";
import {
	categorizeHoles,
	renderRoundedUpReport,
	type RoundUpEvent,
	type UnmachinableHole,
} from "./categorizeHoles";
import { type Hole, parseExcellon } from "./parseExcellon";
import { renderExcellon } from "./renderExcellon";

const MAX_SHOWN = 12;

const holeLocation = (hole: Hole): string => {
	const p = hole.kind === "circle" ? hole : hole.path[0]!;
	return `(${p.x.toFixed(3)}, ${p.y.toFixed(3)})`;
};

const holeSize = (hole: Hole): string =>
	hole.kind === "circle"
		? `Ø${formatDia(hole.diameter)}mm`
		: `${formatDia(hole.width)}mm slot`;

const UnmachinableReport = ({
	items,
	variant,
}: {
	items: readonly UnmachinableHole[];
	variant: "error" | "warning";
}) => {
	const shown = items.slice(0, MAX_SHOWN);
	const remaining = items.length - shown.length;
	return (
		<Box flexDirection="column">
			<Alert variant={variant}>
				{items.length} hole(s) cannot be made with the configured tools. Add a
				matching drill bit (within tolerance) or a smaller cornmill to pocket
				them.
			</Alert>
			{shown.map((item, index) => (
				<Text key={`${item.reason}-${index}`} dimColor>
					{"  • "}
					{holeSize(item.hole)} {item.category} @ {holeLocation(item.hole)} —{" "}
					{item.reason}
				</Text>
			))}
			{remaining > 0 ? (
				<Text dimColor>{`  • …and ${remaining} more`}</Text>
			) : null}
		</Box>
	);
};

const RoundUpReport = ({ events }: { events: readonly RoundUpEvent[] }) => {
	const shown = events.slice(0, MAX_SHOWN);
	const remaining = events.length - shown.length;
	return (
		<Box flexDirection="column">
			<Alert variant="warning">
				{events.length} hole(s) had no exact-size bit and were drilled OVERSIZE
				(rounded up). Even +0.05mm can matter on a small board — details written
				to ROUNDED_UP.txt.
			</Alert>
			{shown.map((e, index) => (
				<Text key={`${e.x}-${e.y}-${index}`} dimColor>
					{"  • "}
					{formatDia(e.trueDiameter)}mm {e.category} @ ({e.x.toFixed(3)},{" "}
					{e.y.toFixed(3)}) → {formatDia(e.bitDiameter)}mm (+
					{formatDia(e.delta)})
				</Text>
			))}
			{remaining > 0 ? (
				<Text dimColor>{`  • …and ${remaining} more`}</Text>
			) : null}
		</Box>
	);
};

const isComponentDrill = (file: string, board: string): boolean => {
	if (!file.toLowerCase().endsWith(".drl")) return false;
	if (file.endsWith("-alignment.drl")) return false;
	return file === `${board}.drl` || file.startsWith(`${board}-`);
};

/**
 * Step 2: categorise every KiCad-exported component hole by how it must be made
 * with the tools on hand, and gate the run on machinability.
 *
 * Reads `gerbers/<board>*.drl` (excluding the alignment file), buckets each hole
 * into one `.drl` per (plating × method × tool) in `paths.drills`, and — when a
 * hole has no exact bit — records the oversize drill to `ROUNDED_UP.txt`. If any
 * hole can't be made at all, it hard-fails before the long CNC job (per config).
 * Alignment holes are handled separately by the CNC stage (this gate ignores them).
 */
export const categorizeDrills = Effect.fn("flatmaxx.categorizeDrills")(
	function* (pcbFile: string, options: DrillCategorizationOptions) {
		if (!options.enabled) {
			const [success] = yield* renderWaiting({
				loading: "Drill machinability check...",
			});
			yield* success("Drill categorization disabled — skipping.");
			return;
		}

		const fs = yield* FileSystem.FileSystem;
		const board = basename(pcbFile, ".kicad_pcb");
		const projectRoot = dirname(pcbFile);
		const roundedUpPath = join(projectRoot, "ROUNDED_UP.txt");

		// Compute the step once and prefix every terminal message with it, so the
		// completed line keeps its "Step N:" title instead of dropping the number.
		const step = nextStep();
		const tag = (message: string): string => `Step ${step}: ${message}`;
		const [success, error, stop, warning] = yield* renderWaiting({
			loading: tag("Categorizing drills & checking machinability..."),
		});

		const clearStaleRoundedUp = Effect.gen(function* () {
			if (yield* fs.exists(roundedUpPath)) yield* fs.remove(roundedUpPath);
		});

		if (!(yield* fs.exists(options.gerbersDir))) {
			yield* clearStaleRoundedUp;
			yield* success(tag("No gerbers directory — no drills to categorize."));
			return;
		}

		const drillFiles = (yield* fs.readDirectory(options.gerbersDir)).filter(
			(file) => isComponentDrill(file, board),
		);
		if (drillFiles.length === 0) {
			yield* clearStaleRoundedUp;
			yield* success(
				tag("No component drill files found — nothing to categorize."),
			);
			return;
		}

		const holes: Hole[] = [];
		for (const file of drillFiles) {
			const text = yield* fs
				.readFileString(join(options.gerbersDir, file))
				.pipe(Effect.tapError(() => stop));
			holes.push(...parseExcellon(text).holes);
		}

		if (holes.length === 0) {
			yield* clearStaleRoundedUp;
			yield* success(tag("Drill files contain no holes."));
			return;
		}

		const { groups, unmachinable, roundUps } = categorizeHoles(holes, {
			drills: options.availableDrills,
			mills: options.availableMills,
			toleranceMm: options.matchToleranceMm,
		});

		// Hard gate — fail before writing anything (and before the CNC job).
		if (unmachinable.length > 0 && options.onFailure === "error") {
			yield* error(
				tag(
					`${unmachinable.length} of ${holes.length} hole(s) cannot be made with the configured tools.`,
				),
			);
			yield* renderOnce(
				<UnmachinableReport items={unmachinable} variant="error" />,
			);
			return yield* Effect.fail(
				new Error(
					`Drill infeasible: ${unmachinable.length} hole(s) have no usable tool. ` +
						"Add a matching drill bit (within cnc.drilling.matchToleranceMm) or a smaller cornmill to availableMills.",
				),
			);
		}

		yield* fs.makeDirectory(options.drillsDir, { recursive: true });
		for (const group of groups) {
			yield* fs.writeFileString(
				join(options.drillsDir, `${board}_${group.fileSuffix}.drl`),
				renderExcellon(group.holes),
			);
		}

		if (roundUps.length > 0) {
			yield* fs.writeFileString(
				roundedUpPath,
				renderRoundedUpReport(board, roundUps),
			);
		} else {
			yield* clearStaleRoundedUp;
		}

		const fileNote = `${groups.length} file(s) in ${basename(options.drillsDir)}/`;

		// A round-up or (in warn mode) an unmachinable hole both warrant a warning
		// terminal; otherwise it's a clean success.
		if (unmachinable.length > 0) {
			yield* warning(
				tag(
					`Categorized ${holes.length} holes → ${fileNote}; ${unmachinable.length} hole(s) NOT machinable (continuing, onFailure=warn).`,
				),
			);
			yield* renderOnce(
				<UnmachinableReport items={unmachinable} variant="warning" />,
			);
		} else if (roundUps.length > 0) {
			yield* warning(
				tag(
					`Categorized ${holes.length} holes → ${fileNote}; ${roundUps.length} hole(s) rounded up (see ROUNDED_UP.txt).`,
				),
			);
		} else {
			yield* success(tag(`Categorized ${holes.length} holes → ${fileNote}.`));
		}

		if (roundUps.length > 0) {
			yield* renderOnce(<RoundUpReport events={roundUps} />);
		}
	},
);

/**
 * Post-CNC pass: categorise the alignment/registration `.drl` the CNC stage
 * writes (`gerbers/<board>-alignment.drl`) into `paths.drills` under the
 * `alignment` category. These holes are exempt from the component machinability
 * gate (registration is a separate first operation with forgiving tooling), but
 * the pass still hard-fails if literally no tool fits them. Any (rare) round-up
 * is appended to ROUNDED_UP.txt so oversize drilling is never silent.
 */
export const categorizeAlignmentDrills = Effect.fn(
	"flatmaxx.categorizeAlignmentDrills",
)(function* (pcbFile: string, options: AlignmentDrillCategorizationOptions) {
	const [success, error, stop, warning] = yield* renderWaiting({
		loading: "Categorizing alignment drills...",
	});

	if (!options.enabled) {
		yield* success("Alignment drills disabled — skipping.");
		return;
	}

	const fs = yield* FileSystem.FileSystem;
	const board = basename(pcbFile, ".kicad_pcb");
	const alignmentPath = join(options.gerbersDir, `${board}-alignment.drl`);

	if (!(yield* fs.exists(alignmentPath))) {
		// Only written for double-sided boards; single-sided has nothing to do.
		yield* success("No alignment drill file (single-sided) — skipping.");
		return;
	}

	const text = yield* fs
		.readFileString(alignmentPath)
		.pipe(Effect.tapError(() => stop));
	const { holes } = parseExcellon(text);
	if (holes.length === 0) {
		yield* success("Alignment drill file is empty — skipping.");
		return;
	}

	const { groups, unmachinable, roundUps } = categorizeHoles(
		holes,
		{
			drills: options.availableDrills,
			mills: options.availableMills,
			toleranceMm: options.matchToleranceMm,
		},
		{ categoryOverride: "alignment" },
	);

	if (unmachinable.length > 0) {
		yield* error(
			`${unmachinable.length} alignment hole(s) cannot be made with any configured tool.`,
		);
		yield* renderOnce(
			<UnmachinableReport items={unmachinable} variant="error" />,
		);
		return yield* Effect.fail(
			new Error(
				`Alignment drills infeasible: ${unmachinable.length} hole(s) have no usable tool. ` +
					"Add a drill bit or a cornmill that fits the registration holes.",
			),
		);
	}

	yield* fs.makeDirectory(options.drillsDir, { recursive: true });
	for (const group of groups) {
		yield* fs.writeFileString(
			join(options.drillsDir, `${board}_${group.fileSuffix}.drl`),
			renderExcellon(group.holes),
		);
	}

	if (roundUps.length > 0) {
		// Rare (registration holes are usually pocketed), but oversize is never silent.
		const roundedUpPath = join(dirname(pcbFile), "ROUNDED_UP.txt");
		const existing = (yield* fs.exists(roundedUpPath))
			? yield* fs.readFileString(roundedUpPath)
			: "";
		const section = renderRoundedUpReport(`${board} (alignment)`, roundUps);
		yield* fs.writeFileString(
			roundedUpPath,
			existing ? `${existing}\n${section}` : section,
		);
		yield* warning(
			`Categorized ${holes.length} alignment hole(s) → ${groups.length} file(s); ${roundUps.length} rounded up (see ROUNDED_UP.txt).`,
		);
		yield* renderOnce(<RoundUpReport events={roundUps} />);
		return;
	}

	yield* success(
		`Categorized ${holes.length} alignment hole(s) → ${groups.length} file(s) in ${basename(
			options.drillsDir,
		)}/.`,
	);
});
