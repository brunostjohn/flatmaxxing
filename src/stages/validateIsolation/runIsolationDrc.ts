import type { IsolationValidationOptions } from "@/config";
import { Effect, Fiber, FileSystem, Ref, Stream } from "effect";
import { ChildProcess } from "effect/unstable/process";
import { basename, dirname, join } from "node:path";

export interface DrcViolationItem {
	readonly description?: string;
	readonly pos?: { readonly x: number; readonly y: number };
	readonly uuid?: string;
}

export interface DrcViolation {
	readonly type: string;
	readonly severity: string;
	readonly description?: string;
	readonly items?: readonly DrcViolationItem[];
}

interface DrcReport {
	readonly violations?: readonly DrcViolation[];
}

export interface IsolationDrcResult {
	/** Violations that mean the tool cannot fully isolate (copper/hole clearance). */
	readonly clearanceViolations: readonly DrcViolation[];
	/** Total violation count (includes non-clearance issues we ignore). */
	readonly totalViolations: number;
}

// Clearance-family violation types from the KiCad DRC report that indicate two
// copper features are closer than the (effective tool) clearance constraint.
const CLEARANCE_TYPES = new Set([
	"clearance",
	"hole_clearance",
	"hole_to_hole",
]);

/** Searchable text for a violation: its description + every feature involved. */
export const violationText = (violation: DrcViolation): string =>
	[violation.description, ...(violation.items ?? []).map((i) => i.description)]
		.filter((s): s is string => Boolean(s))
		.join(" | ");

export interface PartitionedViolations {
	/** Violations that should block the run. */
	readonly blocking: readonly DrcViolation[];
	/** Violations excluded by the configured ignore patterns. */
	readonly ignored: readonly DrcViolation[];
}

/** Splits violations into ignored (matching any pattern) vs blocking. */
export const partitionViolations = (
	violations: readonly DrcViolation[],
	patterns: readonly RegExp[],
): PartitionedViolations => {
	const blocking: DrcViolation[] = [];
	const ignored: DrcViolation[] = [];
	for (const violation of violations) {
		const text = violationText(violation);
		if (patterns.some((pattern) => pattern.test(text))) {
			ignored.push(violation);
		} else {
			blocking.push(violation);
		}
	}
	return { blocking, ignored };
};

/** Compiles ignore-regex strings, with a clear error on an invalid pattern. */
export const compileIgnorePatterns = (patterns: readonly string[]): RegExp[] =>
	patterns.map((pattern) => {
		try {
			return new RegExp(pattern);
		} catch (error) {
			throw new Error(
				`Invalid validation.isolationFeasibility.ignore regex ${JSON.stringify(
					pattern,
				)}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	});

const formatMm = (value: number): string => value.toFixed(4);

/**
 * Builds a custom KiCad design-rule that requires `effectiveDiameter` of
 * clearance between copper features on the machined layers. kicad-cli auto-loads
 * a sibling `<board>.kicad_dru`. DRC uses the max of applicable clearance rules,
 * so this raises the checked clearance to the tool width where the design allows
 * tighter gaps, and is harmlessly subsumed where the design is already wider.
 */
export const buildIsolationDru = (
	effectiveDiameter: number,
	layers: readonly string[],
): string => {
	const copperTypes =
		"A.Type == 'pad' || A.Type == 'track' || A.Type == 'via' || A.Type == 'zone'";
	const layerScope =
		layers.length > 0
			? ` && (${layers.map((l) => `A.existsOnLayer('${l}')`).join(" || ")})`
			: "";
	return [
		"(version 1)",
		'(rule "flatmaxx_vbit_isolation"',
		`    (constraint clearance (min ${formatMm(effectiveDiameter)}mm))`,
		`    (condition "${copperTypes}${layerScope}"))`,
		"",
	].join("\n");
};

const collectStream = (
	stream: Stream.Stream<Uint8Array, unknown>,
	sink: Ref.Ref<string>,
) => {
	const decoder = new TextDecoder();
	return Stream.runForEach(stream, (chunk) =>
		Ref.update(sink, (acc) => acc + decoder.decode(chunk)),
	);
};

/**
 * Copies the board (and its project, to preserve real net-class rules) into a
 * temp dir, drops in the isolation `.kicad_dru`, runs `kicad-cli pcb drc`, and
 * returns the clearance-family violations. Scope-bound: the temp dir is removed
 * when the calling scope closes.
 */
export const runIsolationDrc = Effect.fn("flatmaxx.validateIsolation.runDrc")(
	function* (
		kicadCli: string,
		pcbFile: string,
		options: IsolationValidationOptions,
	) {
		const fs = yield* FileSystem.FileSystem;

		const base = basename(pcbFile, ".kicad_pcb");
		const tempDir = yield* fs.makeTempDirectoryScoped({
			prefix: "flatmaxx-drc-",
		});
		const tempPcb = join(tempDir, `${base}.kicad_pcb`);
		yield* fs.copyFile(pcbFile, tempPcb);

		// Preserve the project's real design rules / net classes when present.
		// Skip an empty/missing .kicad_pro — copying it makes kicad-cli log a
		// JSON parse error, and it carries no rules anyway (DRC falls back to
		// defaults + our injected .kicad_dru).
		const projectFile = join(dirname(pcbFile), `${base}.kicad_pro`);
		const projectContent = yield* fs
			.readFileString(projectFile)
			.pipe(Effect.orElseSucceed(() => ""));
		if (projectContent.trim().length > 0) {
			yield* fs.writeFileString(
				join(tempDir, `${base}.kicad_pro`),
				projectContent,
			);
		}

		yield* fs.writeFileString(
			join(tempDir, `${base}.kicad_dru`),
			buildIsolationDru(options.effectiveDiameter, options.layers),
		);

		const reportPath = join(tempDir, "drc-report.json");

		const handle = yield* ChildProcess.make(
			kicadCli,
			[
				"pcb",
				"drc",
				"--format",
				"json",
				"--severity-error",
				"--output",
				reportPath,
				tempPcb,
			],
			{ cwd: tempDir },
		);

		const output = yield* Ref.make("");
		const stderrFiber = yield* collectStream(handle.stderr, output).pipe(
			Effect.forkChild,
		);
		const stdoutFiber = yield* collectStream(handle.stdout, output).pipe(
			Effect.forkChild,
		);

		const code = yield* handle.exitCode;
		yield* Effect.all([Fiber.join(stderrFiber), Fiber.join(stdoutFiber)]);

		const reportExists = yield* fs.exists(reportPath);
		if (!reportExists) {
			const log = yield* Ref.get(output);
			return yield* Effect.fail(
				new Error(
					`kicad-cli pcb drc produced no report (exit ${code}).\n${log}`,
				),
			);
		}

		const report = JSON.parse(
			yield* fs.readFileString(reportPath),
		) as DrcReport;
		const violations = report.violations ?? [];

		return {
			clearanceViolations: violations.filter((v) =>
				CLEARANCE_TYPES.has(v.type),
			),
			totalViolations: violations.length,
		} satisfies IsolationDrcResult;
	},
	Effect.scoped,
);
