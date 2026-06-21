import type { IsolationValidationOptions } from "@/config";
import { renderOnce, renderWaiting } from "@/inkHelpers";
import { Alert } from "@inkjs/ui";
import { Effect } from "effect";
import { Box, Text } from "ink";
import {
	compileIgnorePatterns,
	type DrcViolation,
	partitionViolations,
	runIsolationDrc,
} from "./runIsolationDrc";

const MAX_SHOWN = 12;

const describeViolation = (violation: DrcViolation): string => {
	const pos = violation.items?.find((item) => item.pos)?.pos;
	const where = pos ? ` @ (${pos.x.toFixed(3)}, ${pos.y.toFixed(3)})mm` : "";
	return `${violation.description ?? violation.type}${where}`;
};

const ViolationReport = ({
	violations,
	effectiveDiameter,
	variant,
}: {
	violations: readonly DrcViolation[];
	effectiveDiameter: number;
	variant: "error" | "warning";
}) => {
	const shown = violations.slice(0, MAX_SHOWN);
	const remaining = violations.length - shown.length;
	return (
		<Box flexDirection="column">
			<Alert variant={variant}>
				{violations.length} copper location(s) are closer than the{" "}
				{effectiveDiameter.toFixed(4)}mm effective V-bit width and cannot be
				isolated. Use a finer tip/angle or a shallower cut, or widen the
				offending clearances.
			</Alert>
			{shown.map((violation, index) => (
				<Text key={`${describeViolation(violation)}-${index}`} dimColor>
					{"  • "}
					{describeViolation(violation)}
				</Text>
			))}
			{remaining > 0 ? (
				<Text dimColor>{`  • …and ${remaining} more`}</Text>
			) : null}
		</Box>
	);
};

/**
 * Pre-flight gate: confirms the configured isolation V-bit can separate every
 * trace before any G-code is generated. Implemented as a KiCad DRC run whose
 * clearance constraint is the tool's effective cutting width — any clearance
 * violation is a gap the tool cannot machine. Hard-fails (or warns) per config.
 */
export const validateIsolation = Effect.fn("flatmaxx.validateIsolation")(
	function* (
		kicadCli: string,
		pcbFile: string,
		options: IsolationValidationOptions,
	) {
		if (!options.enabled) {
			const [success] = yield* renderWaiting({
				loading: "Isolation feasibility check...",
			});
			yield* success("Isolation feasibility check disabled — skipping.");
			return;
		}

		const eff = options.effectiveDiameter.toFixed(4);
		const [success, error, stop, warning] = yield* renderWaiting({
			loading: `Step 3: Validating traces are isolatable with the ${eff}mm V-bit...`,
		});

		// Compile ignore patterns up front so a bad regex fails fast and clearly.
		const patterns = yield* Effect.try({
			try: () => compileIgnorePatterns(options.ignorePatterns),
			catch: (cause) =>
				cause instanceof Error ? cause : new Error(String(cause)),
		}).pipe(Effect.tapError(() => stop));

		const result = yield* runIsolationDrc(kicadCli, pcbFile, options).pipe(
			Effect.tapError(() => stop),
		);

		const { blocking, ignored } = partitionViolations(
			result.clearanceViolations,
			patterns,
		);
		const ignoredNote =
			ignored.length > 0 ? ` (${ignored.length} ignored by config)` : "";

		if (blocking.length === 0) {
			yield* success(
				`All traces can be isolated with the ${eff}mm V-bit (DRC clean)${ignoredNote}.`,
			);
			return;
		}

		const count = blocking.length;

		if (options.onFailure === "warn") {
			yield* warning(
				`${count} location(s) cannot be isolated with the ${eff}mm V-bit — continuing anyway${ignoredNote}.`,
			);
			yield* renderOnce(
				<ViolationReport
					violations={blocking}
					effectiveDiameter={options.effectiveDiameter}
					variant="warning"
				/>,
			);
			return;
		}

		yield* error(
			`${count} location(s) cannot be isolated with the ${eff}mm V-bit${ignoredNote}.`,
		);
		yield* renderOnce(
			<ViolationReport
				violations={blocking}
				effectiveDiameter={options.effectiveDiameter}
				variant="error"
			/>,
		);
		yield* Effect.fail(
			new Error(
				`Isolation infeasible: ${count} clearance violation(s) with the ${eff}mm V-bit. ` +
					"Use a finer tip/angle, a shallower cut, or add a validation.isolationFeasibility.ignore regex for intentional offenders.",
			),
		);
	},
);
