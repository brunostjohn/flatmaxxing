import {
	buildAlignmentDrillCategorizationOptions,
	buildEdgeCutGerberOptions,
	buildMakeracamStepOptions,
	buildBoardSelectionOptions,
	buildBoardValidationOptions,
	buildDrillCategorizationOptions,
	buildIsolationValidationOptions,
	buildKicadOutputOptions,
	buildXToolProjectOptions,
	loadFlatmaxxConfig,
} from "@/config";
import { resetSteps } from "@/inkHelpers";
import { preflightAccessibility } from "@/macos";
import {
	buildCncJobOptions,
	categorizeAlignmentDrills,
	categorizeDrills,
	createXtoolProjects,
	ensureKicadExists,
	findPCBProject,
	generateCncJobs,
	generateEdgeCutGerbers,
	generateKicadOutputs,
	runFinalCut,
	runPlatedHoles,
	validateIsolation,
	validateKicadBoard,
} from "@/stages";
import { BunRuntime, BunServices } from "@effect/platform-bun";
import { Effect, Layer, Option } from "effect";
import { Argument, Command, Flag } from "effect/unstable/cli";
import { basename, join } from "node:path";

const Flatmaxx = Command.make(
	"flatmaxx",
	{
		kicadProject: Argument.string("kicad-project").pipe(
			Argument.withDescription("The path to the KiCAD project directory."),
			Argument.withDefault(process.cwd()),
		),
		pathTokKicad: Flag.string("path-to-kicad").pipe(
			Flag.withAlias("-k"),
			Flag.withDescription("The path to the KiCAD CLI executable."),
			Flag.optional,
		),
		configPath: Flag.string("config").pipe(
			Flag.withAlias("-c"),
			Flag.withDescription("The path to a flatmaxxing TOML config file."),
			Flag.optional,
		),
	},
	Effect.fn("flatmaxx.main")(function* ({
		kicadProject,
		pathTokKicad,
		configPath,
	}) {
		// yield* Effect.sync(() => askForAccessibilityAccess());

		yield* Effect.sync(resetSteps);

		const config = yield* loadFlatmaxxConfig({
			projectRoot: kicadProject,
			configPath: Option.getOrUndefined(configPath),
			cliOverrides: {
				kicadCli: Option.getOrUndefined(pathTokKicad),
			},
		});
		const kicadCli =
			config.dependencies.kicadCli ??
			"/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli";
		const flatcam = config.dependencies.flatcam ?? "flatcam";

		yield* ensureKicadExists(kicadCli);

		const pcbFile = yield* findPCBProject(
			kicadProject,
			buildBoardSelectionOptions(config),
		);

		yield* validateKicadBoard(pcbFile, buildBoardValidationOptions(config));

		yield* generateKicadOutputs(
			kicadCli,
			kicadProject,
			pcbFile,
			buildKicadOutputOptions(config),
		);

		// Gate the run: every component hole must be makeable with the tools on hand.
		yield* categorizeDrills(pcbFile, buildDrillCategorizationOptions(config));

		// Gate CNC generation: the chosen V-bit must be able to isolate every trace.
		yield* validateIsolation(
			kicadCli,
			pcbFile,
			buildIsolationValidationOptions(config),
		);

		yield* generateCncJobs(flatcam, pcbFile, buildCncJobOptions(config));

		// Copy the CNC-generated alignment drill into ./drills, categorized by tool.
		yield* categorizeAlignmentDrills(
			pcbFile,
			buildAlignmentDrillCategorizationOptions(config),
		);

		// Generate the plating + final edge-cut outline Gerbers for MakeraCAM import.
		yield* generateEdgeCutGerbers(pcbFile, buildEdgeCutGerberOptions(config));

		const pcbName = yield* Effect.sync(() => basename(pcbFile, ".kicad_pcb"));
		yield* createXtoolProjects(
			kicadProject,
			pcbName,
			buildXToolProjectOptions(config),
		);

		// Final machining steps: drive MakeraCAM to build + export the plated and
		// final G-code/.mkc. Skippable per step; requires Accessibility when enabled.
		const makeracamEnabled =
			config.makeracam.platedHoles.generate ||
			config.makeracam.finalCut.generate;
		if (makeracamEnabled) {
			yield* preflightAccessibility();
		}
		const contourMillDiameter = Math.max(
			...config.cnc.availableMills.map((mill) => mill.diameter),
		);
		yield* runPlatedHoles(
			pcbName,
			join(config.paths.gerbers, `${pcbName}-PTH_EdgeCuts.dxf`),
			contourMillDiameter,
			buildMakeracamStepOptions(config, "plated"),
		);
		yield* runFinalCut(
			pcbName,
			join(config.paths.gerbers, `${pcbName}-Final_EdgeCuts.dxf`),
			contourMillDiameter,
			buildMakeracamStepOptions(config, "final"),
		);
	}),
).pipe(
	Command.withDescription("Creates CNC files from a KiCAD project."),
	Command.withExamples([
		{
			command: "flatmaxx <kicad-project>",
			description: "Creates CNC files from a KiCAD project.",
		},
		{
			command: "flatmaxx <kicad-project> -k <path-to-kicad>",
			description:
				"Creates CNC files from a KiCAD project with a custom KiCAD CLI executable.",
		},
		{
			command: "flatmaxx <kicad-project> --config flatmaxxing.toml",
			description: "Creates CNC files using an explicit config file.",
		},
	]),
);

Flatmaxx.pipe(
	Command.run({ version: "1.0.0" }),
	Effect.provide(Layer.mergeAll(BunServices.layer)),
	Effect.scoped,
	BunRuntime.runMain({ disableErrorReporting: false }),
);
