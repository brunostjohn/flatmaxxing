import type { IsolationValidationOptions } from "@/config";
import { DrcError } from "@/errors";
import {
  createTasklist,
  markTaskBranch,
  nextStep,
  renderOnce,
} from "@/inkHelpers";
import { Alert } from "@inkjs/ui";
import { Effect, Match } from "effect";
import { Box, Text } from "ink";
import { MAX_SHOWN_VIOLATIONS } from "./constants";
import {
  compileIgnorePatterns,
  partitionViolations,
  runIsolationDrc,
} from "./runIsolationDrc";
import type { DrcViolation } from "./schema";
import { isolationTasks } from "./tasks";
import { isolationTaskPaths } from "./taskPaths";

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
  const shown = violations.slice(0, MAX_SHOWN_VIOLATIONS);
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

export const validateIsolation = Effect.fn("flatmaxx.validateIsolation")(
  function* (
    kicadCli: string,
    pcbFile: string,
    options: IsolationValidationOptions,
  ) {
    const title = options.enabled
      ? `Step ${nextStep()}: Validate isolation feasibility`
      : "Validate isolation feasibility (skipped)";
    const tasks = yield* createTasklist(isolationTasks, title);

    if (!options.enabled) {
      yield* markTaskBranch(tasks, isolationTasks, isolationTaskPaths.root, {
        state: "success",
        label: "Isolation feasibility check skipped.",
        status: "Isolation feasibility check disabled.",
        childStatus: "Isolation feasibility check disabled.",
      });
      return;
    }

    const eff = options.effectiveDiameter.toFixed(4);

    const patterns = yield* tasks.runTask({
      path: isolationTaskPaths.compilePatterns,
      effect: compileIgnorePatterns(options.ignorePatterns),
      loading: { status: "Compiling ignore patterns..." },
      success: { label: "Ignore patterns compiled." },
      error: { label: "Invalid ignore pattern." },
    });

    const result = yield* tasks.runTask({
      path: isolationTaskPaths.runDrc,
      effect: runIsolationDrc(kicadCli, pcbFile, options),
      loading: {
        status: `Validating traces are isolatable with the ${eff}mm V-bit...`,
      },
      success: { label: "KiCad clearance DRC complete." },
      error: { label: "KiCad clearance DRC failed." },
    });

    const { blocking, ignored } = partitionViolations(
      result.clearanceViolations,
      patterns,
    );
    const ignoredNote =
      ignored.length > 0 ? ` (${ignored.length} ignored by config)` : "";

    const count = blocking.length;

    return yield* Match.value({
      hasBlocking: count > 0,
      onFailure: options.onFailure,
    }).pipe(
      Match.when({ hasBlocking: false }, () =>
        tasks.patchTask(isolationTaskPaths.evaluate, {
          state: "success",
          label: `All traces isolatable with the ${eff}mm V-bit.`,
          status: `DRC clean${ignoredNote}.`,
        }),
      ),
      Match.when({ onFailure: "warn" }, () =>
        Effect.gen(function* () {
          yield* tasks.patchTask(isolationTaskPaths.evaluate, {
            state: "warning",
            label: `${count} location(s) cannot be isolated with the ${eff}mm V-bit.`,
            status: `Continuing anyway${ignoredNote}.`,
          });
          yield* renderOnce(
            <ViolationReport
              violations={blocking}
              effectiveDiameter={options.effectiveDiameter}
              variant="warning"
            />,
          );
        }),
      ),
      Match.orElse(() =>
        Effect.gen(function* () {
          yield* tasks.patchTask(isolationTaskPaths.evaluate, {
            state: "error",
            label: `${count} location(s) cannot be isolated with the ${eff}mm V-bit.`,
            status: ignoredNote.trim(),
          });
          yield* renderOnce(
            <ViolationReport
              violations={blocking}
              effectiveDiameter={options.effectiveDiameter}
              variant="error"
            />,
          );
          return yield* Effect.fail(
            new DrcError({
              message:
                `Isolation infeasible: ${count} clearance violation(s) with the ${eff}mm V-bit. ` +
                "Use a finer tip/angle, a shallower cut, or add a validation.isolationFeasibility.ignore regex for intentional offenders.",
            }),
          );
        }),
      ),
    );
  },
);
