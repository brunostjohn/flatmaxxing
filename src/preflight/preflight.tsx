import type { ResolvedConfig } from "@/config";
import { renderOnce } from "@/inkHelpers";
import { preflightAccessibility } from "@/macos";
import { PreflightError } from "@/errors";
import { Array, Effect, Match, Option } from "effect";
import { Box, Text } from "ink";
import { DEFAULT_PREFLIGHT_TITLE } from "./constants";
import {
  resolveAppDependency,
  resolveExecutableDependency,
} from "./dependencyResolver";
import { buildPreflightRequirements } from "./requirements";
import { isTcpPortOpen, validateHostPort } from "./tcpCheck";
import type {
  DependencyResolution,
  PreflightReport,
  PreflightRequirement,
  PreflightResult,
  PreflightStatus,
  RunPreflightOptions,
} from "./types";

const pass = (
  requirement: PreflightRequirement,
  message: string,
  detail?: string,
): PreflightResult => ({
  id: requirement.id,
  label: requirement.label,
  severity: requirement.severity,
  status: "pass",
  message,
  detail,
});

const fail = (
  requirement: PreflightRequirement,
  message: string,
  detail?: string,
): PreflightResult => ({
  id: requirement.id,
  label: requirement.label,
  severity: requirement.severity,
  status: requirement.severity === "warning" ? "warn" : "fail",
  message,
  detail,
});

const fromResolution = (
  requirement: PreflightRequirement,
  resolution: DependencyResolution,
): PreflightResult =>
  resolution.status === "found"
    ? pass(requirement, `Found ${resolution.path}.`)
    : fail(requirement, resolution.message, resolution.detail);

export const runPreflightRequirement = (requirement: PreflightRequirement) =>
  Match.value(requirement).pipe(
    Match.discriminatorsExhaustive("type")({
      executable: (req) =>
        resolveExecutableDependency(req.value).pipe(
          Effect.map((resolution) => fromResolution(req, resolution)),
        ),
      app: (req) =>
        resolveAppDependency(req.value).pipe(
          Effect.map((resolution) => fromResolution(req, resolution)),
        ),
      accessibility: (req) =>
        preflightAccessibility().pipe(
          Effect.as(
            pass(
              req,
              "Accessibility access is granted for the current runner.",
            ),
          ),
          Effect.catch((error) =>
            Effect.succeed(
              fail(req, error instanceof Error ? error.message : String(error)),
            ),
          ),
        ),
      "xtool-cdp-config": (req) =>
        Option.match(validateHostPort(req.host, req.port), {
          onNone: () =>
            Effect.succeed(
              pass(req, `${req.host}:${req.port} is a valid CDP endpoint.`),
            ),
          onSome: (message) => Effect.succeed(fail(req, message)),
        }),
      "tcp-port-warning": (req) =>
        Option.match(validateHostPort(req.host, req.port), {
          onSome: () =>
            Effect.succeed<PreflightResult>({
              id: req.id,
              label: req.label,
              severity: req.severity,
              status: "skip",
              message: "Skipped because the CDP host/port is invalid.",
            }),
          onNone: () =>
            isTcpPortOpen(req.host, req.port).pipe(
              Effect.map((open) =>
                open
                  ? fail(
                      req,
                      `${req.host}:${req.port} already accepts connections.`,
                      "If xTool Studio is already open, flatmaxx will ask you to close it before launching its own session.",
                    )
                  : pass(
                      req,
                      `${req.host}:${req.port} is not currently in use.`,
                    ),
              ),
            ),
        }),
    }),
  );

export const preflightFailures = (report: PreflightReport) =>
  report.results.filter(
    (result) => result.severity === "required" && result.status === "fail",
  );

const preflightErrorMessage = (report: PreflightReport) =>
  [
    "Preflight checks failed:",
    ...preflightFailures(report).map(
      (result) => `- ${result.label}: ${result.message}`,
    ),
  ].join("\n");

export const failIfPreflightFailed = (
  report: PreflightReport,
): Effect.Effect<PreflightReport, PreflightError> =>
  Array.isArrayNonEmpty(preflightFailures(report))
    ? Effect.fail(
        new PreflightError({ message: preflightErrorMessage(report) }),
      )
    : Effect.succeed(report);

const statusLabel = (status: PreflightStatus) =>
  Match.value(status).pipe(
    Match.when("pass", () => "PASS"),
    Match.when("fail", () => "FAIL"),
    Match.when("warn", () => "WARN"),
    Match.when("skip", () => "SKIP"),
    Match.exhaustive,
  );

const statusColor = (status: PreflightStatus) =>
  Match.value(status).pipe(
    Match.when("pass", () => "green"),
    Match.when("fail", () => "red"),
    Match.when("warn", () => "yellow"),
    Match.when("skip", () => "gray"),
    Match.exhaustive,
  );

export const renderPreflightReport = (report: PreflightReport) =>
  renderOnce(
    <Box flexDirection="column">
      <Text bold>{report.title}</Text>
      {report.results.map((result) => (
        <Box key={result.id} flexDirection="column">
          <Text>
            <Text color={statusColor(result.status)}>
              {statusLabel(result.status)}
            </Text>{" "}
            {result.label}: {result.message}
          </Text>
          {result.detail ? <Text color="gray"> {result.detail}</Text> : null}
        </Box>
      ))}
    </Box>,
  );

export const runPreflight = Effect.fn("flatmaxx.preflight.run")(function* (
  config: ResolvedConfig,
  options: RunPreflightOptions = {},
) {
  const title = options.title ?? DEFAULT_PREFLIGHT_TITLE;
  const requirements = buildPreflightRequirements(config);
  const results = yield* Effect.forEach(requirements, runPreflightRequirement);
  const report = { title, results } satisfies PreflightReport;

  if (options.render !== false) {
    yield* renderPreflightReport(report);
  }

  return yield* failIfPreflightFailed(report);
});
