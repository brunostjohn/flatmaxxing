import type { IsolationValidationOptions } from "@/config";
import { DrcError } from "@/errors";
import { runCollectingBoth } from "@/process";
import { Array, Effect, FileSystem, Path, Result, Schema } from "effect";
import { CLEARANCE_TYPES } from "./constants";
import { DrcReportSchema, type DrcViolation } from "./schema";
import type { IsolationDrcResult, PartitionedViolations } from "./types";

export const violationText = (violation: DrcViolation) =>
  [violation.description, ...(violation.items ?? []).map((i) => i.description)]
    .filter((s): s is string => Boolean(s))
    .join(" | ");

export const partitionViolations = (
  violations: readonly DrcViolation[],
  patterns: readonly RegExp[],
): PartitionedViolations => {
  const [blocking, ignored] = Array.partition(violations, (violation) => {
    const text = violationText(violation);
    return patterns.some((pattern) => pattern.test(text))
      ? Result.succeed(violation)
      : Result.fail(violation);
  });
  return { blocking, ignored };
};

const makeRegexUnsafe = (pattern: string) => new RegExp(pattern);

const invalidIgnorePatternError = (pattern: string, cause: unknown) =>
  new DrcError({
    message: `Invalid validation.isolationFeasibility.ignore regex ${JSON.stringify(
      pattern,
    )}: ${cause instanceof Error ? cause.message : String(cause)}`,
    cause,
  });

export const compileIgnorePatterns = (patterns: readonly string[]) =>
  Effect.forEach(patterns, (pattern) =>
    Effect.try({
      try: () => makeRegexUnsafe(pattern),
      catch: (cause) => invalidIgnorePatternError(pattern, cause),
    }),
  );

const formatMm = (value: number) => value.toFixed(4);

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

const parseJsonUnsafe = (text: string) => JSON.parse(text);

const parseDrcReport = Effect.fn("flatmaxx.validateIsolation.parseDrcReport")(
  function* (text: string) {
    const raw = yield* Effect.try({
      try: () => parseJsonUnsafe(text),
      catch: (cause) =>
        new DrcError({ message: "KiCad DRC report is not valid JSON.", cause }),
    });

    return yield* Schema.decodeUnknownEffect(DrcReportSchema)(raw).pipe(
      Effect.mapError(
        (cause) =>
          new DrcError({
            message: "KiCad DRC report has an invalid shape.",
            cause,
          }),
      ),
    );
  },
);

export const runIsolationDrc = Effect.fn("flatmaxx.validateIsolation.runDrc")(
  function* (
    kicadCli: string,
    pcbFile: string,
    options: IsolationValidationOptions,
  ) {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    const base = path.basename(pcbFile, ".kicad_pcb");
    const tempDir = yield* fs.makeTempDirectoryScoped({
      prefix: "flatmaxx-drc-",
    });
    const tempPcb = path.join(tempDir, `${base}.kicad_pcb`);
    yield* fs.copyFile(pcbFile, tempPcb);

    const projectFile = path.join(path.dirname(pcbFile), `${base}.kicad_pro`);
    const projectContent = yield* fs
      .readFileString(projectFile)
      .pipe(Effect.orElseSucceed(() => ""));

    yield* fs
      .writeFileString(path.join(tempDir, `${base}.kicad_pro`), projectContent)
      .pipe(Effect.when(Effect.sync(() => projectContent.trim().length > 0)));

    yield* fs.writeFileString(
      path.join(tempDir, `${base}.kicad_dru`),
      buildIsolationDru(options.effectiveDiameter, options.layers),
    );

    const reportPath = path.join(tempDir, "drc-report.json");

    const { stdout, stderr, exitCode } = yield* runCollectingBoth(
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

    const reportExists = yield* fs.exists(reportPath);

    const violations = yield* fs.readFileString(reportPath).pipe(
      Effect.filterOrFail(
        () => reportExists,
        () =>
          new DrcError({
            message: `kicad-cli pcb drc produced no report (exit ${exitCode}).\n${stderr}${stdout}`,
          }),
      ),
      Effect.flatMap(parseDrcReport),
      Effect.map((report) => report.violations ?? []),
    );

    return {
      clearanceViolations: violations.filter((v) =>
        CLEARANCE_TYPES.has(v.type),
      ),
      totalViolations: violations.length,
    } satisfies IsolationDrcResult;
  },
  Effect.scoped,
);
