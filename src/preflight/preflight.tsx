import {
  buildXToolProjectOptions,
  defaultFlatcam,
  defaultKicadCli,
  type ResolvedConfig,
} from "@/config";
import { renderOnce } from "@/inkHelpers";
import { preflightAccessibility } from "@/macos";
import { Effect } from "effect";
import { Box, Text } from "ink";
import { accessSync, constants, statSync, type Stats } from "node:fs";
import { delimiter, isAbsolute, join, resolve } from "node:path";
import { Socket } from "node:net";

export type PreflightSeverity = "required" | "warning";
export type PreflightStatus = "pass" | "fail" | "warn" | "skip";

export type PreflightResult = {
  readonly id: string;
  readonly label: string;
  readonly severity: PreflightSeverity;
  readonly status: PreflightStatus;
  readonly message: string;
  readonly detail?: string | undefined;
};

export type PreflightReport = {
  readonly title: string;
  readonly results: readonly PreflightResult[];
};

type DependencyResolution =
  | {
      readonly status: "found";
      readonly path: string;
    }
  | {
      readonly status: "missing";
      readonly message: string;
      readonly detail?: string | undefined;
    };

export type DependencyResolverFs = {
  readonly stat: (path: string) => StatsLike | undefined;
  readonly canExecute: (path: string) => boolean;
};

export type StatsLike = Pick<Stats, "isDirectory" | "isFile" | "mode">;

export type DependencyResolverOptions = {
  readonly cwd?: string | undefined;
  readonly env?: Pick<NodeJS.ProcessEnv, "PATH"> | undefined;
  readonly fs?: DependencyResolverFs | undefined;
};

export type PreflightRequirement =
  | {
      readonly type: "executable";
      readonly id: string;
      readonly label: string;
      readonly value: string;
      readonly severity: PreflightSeverity;
    }
  | {
      readonly type: "app";
      readonly id: string;
      readonly label: string;
      readonly value: string;
      readonly severity: PreflightSeverity;
    }
  | {
      readonly type: "accessibility";
      readonly id: string;
      readonly label: string;
      readonly severity: PreflightSeverity;
    }
  | {
      readonly type: "xtool-cdp-config";
      readonly id: string;
      readonly label: string;
      readonly host: string;
      readonly port: number;
      readonly severity: PreflightSeverity;
    }
  | {
      readonly type: "tcp-port-warning";
      readonly id: string;
      readonly label: string;
      readonly host: string;
      readonly port: number;
      readonly severity: PreflightSeverity;
    };

const defaultResolverFs: DependencyResolverFs = {
  stat: (path) => {
    try {
      return statSync(path);
    } catch {
      return undefined;
    }
  },
  canExecute: (path) => {
    try {
      accessSync(path, constants.X_OK);
      return true;
    } catch {
      return false;
    }
  },
};

const pathEntries = (envPath: string | undefined) =>
  (envPath ?? "")
    .split(delimiter)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

const hasPathSeparator = (value: string) =>
  value.includes("/") || value.includes("\\");

const explicitPath = (value: string, cwd: string) =>
  isAbsolute(value) ? value : resolve(cwd, value);

export const resolveExecutableDependency = (
  value: string,
  options: DependencyResolverOptions = {},
): DependencyResolution => {
  const trimmed = value.trim();
  const fs = options.fs ?? defaultResolverFs;
  const cwd = options.cwd ?? process.cwd();

  if (trimmed.length === 0) {
    return { status: "missing", message: "No executable path configured." };
  }

  const candidates = hasPathSeparator(trimmed)
    ? [explicitPath(trimmed, cwd)]
    : pathEntries(options.env?.PATH ?? process.env.PATH).map((entry) =>
        join(entry, trimmed),
      );

  if (candidates.length === 0) {
    return {
      status: "missing",
      message: `"${trimmed}" was not found because PATH is empty.`,
    };
  }

  let foundButNotExecutable: string | undefined;
  let foundButNotFile: string | undefined;

  for (const candidate of candidates) {
    const stats = fs.stat(candidate);
    if (stats === undefined) continue;

    if (!stats.isFile()) {
      foundButNotFile = candidate;
      continue;
    }

    if (!fs.canExecute(candidate)) {
      foundButNotExecutable = candidate;
      continue;
    }

    return { status: "found", path: candidate };
  }

  if (foundButNotExecutable) {
    return {
      status: "missing",
      message: `"${trimmed}" exists but is not executable.`,
      detail: foundButNotExecutable,
    };
  }

  if (foundButNotFile) {
    return {
      status: "missing",
      message: `"${trimmed}" exists but is not a file.`,
      detail: foundButNotFile,
    };
  }

  return {
    status: "missing",
    message: hasPathSeparator(trimmed)
      ? `"${explicitPath(trimmed, cwd)}" does not exist.`
      : `"${trimmed}" was not found on PATH.`,
  };
};

export const resolveAppDependency = (
  value: string,
  options: DependencyResolverOptions = {},
): DependencyResolution => {
  const trimmed = value.trim();
  const fs = options.fs ?? defaultResolverFs;
  const cwd = options.cwd ?? process.cwd();
  const path = explicitPath(trimmed, cwd);

  if (trimmed.length === 0) {
    return { status: "missing", message: "No app path configured." };
  }

  const stats = fs.stat(path);
  if (stats === undefined) {
    return { status: "missing", message: `"${path}" does not exist.` };
  }

  if (!stats.isDirectory()) {
    return {
      status: "missing",
      message: `"${path}" exists but is not an app bundle directory.`,
    };
  }

  return { status: "found", path };
};

export const isCncPreflightEnabled = (config: ResolvedConfig): boolean =>
  config.cnc.isolation.tool !== undefined;

export const isMakeracamPreflightEnabled = (config: ResolvedConfig): boolean =>
  config.makeracam.platedHoles.generate || config.makeracam.finalCut.generate;

export const isXToolPreflightEnabled = (config: ResolvedConfig): boolean =>
  buildXToolProjectOptions(config).enabled;

const uniqueRequirements = (
  requirements: readonly PreflightRequirement[],
): readonly PreflightRequirement[] => {
  const seen = new Set<string>();
  return requirements.filter((requirement) => {
    if (seen.has(requirement.id)) return false;
    seen.add(requirement.id);
    return true;
  });
};

const commandRequirement = (command: string): PreflightRequirement => ({
  type: "executable",
  id: `command:${command}`,
  label: `${command} command`,
  value: command,
  severity: "required",
});

export const buildPreflightRequirements = (
  config: ResolvedConfig,
): readonly PreflightRequirement[] => {
  const requirements: PreflightRequirement[] = [
    {
      type: "executable",
      id: "dependency:kicad-cli",
      label: "KiCad CLI",
      value: config.dependencies.kicadCli ?? defaultKicadCli,
      severity: "required",
    },
  ];

  const cncEnabled = isCncPreflightEnabled(config);
  const xToolEnabled = isXToolPreflightEnabled(config);
  const makeracamEnabled = isMakeracamPreflightEnabled(config);
  const macAutomationEnabled = xToolEnabled || makeracamEnabled;

  if (cncEnabled) {
    requirements.push({
      type: "executable",
      id: "dependency:flatcam",
      label: "FlatCAM",
      value: config.dependencies.flatcam ?? defaultFlatcam,
      severity: "required",
    });
    requirements.push(commandRequirement("sh"));
    requirements.push(commandRequirement("pkill"));
    requirements.push(commandRequirement("kill"));
  }

  if (xToolEnabled) {
    requirements.push({
      type: "app",
      id: "dependency:xtool-studio",
      label: "xTool Studio app",
      value: config.xtool.appPath,
      severity: "required",
    });
    requirements.push({
      type: "xtool-cdp-config",
      id: "xtool:cdp-config",
      label: "xTool CDP configuration",
      host: config.xtool.cdpHost,
      port: config.xtool.cdpPort,
      severity: "required",
    });
    requirements.push({
      type: "tcp-port-warning",
      id: "xtool:cdp-port",
      label: "xTool CDP port availability",
      host: config.xtool.cdpHost,
      port: config.xtool.cdpPort,
      severity: "warning",
    });
  }

  if (makeracamEnabled) {
    requirements.push({
      type: "app",
      id: "dependency:makeracam",
      label: "MakeraCAM app",
      value: config.makeracam.appPath,
      severity: "required",
    });
  }

  if (macAutomationEnabled) {
    requirements.push(commandRequirement("open"));
    requirements.push(commandRequirement("pgrep"));
    requirements.push(commandRequirement("osascript"));
    requirements.push({
      type: "accessibility",
      id: "macos:accessibility",
      label: "macOS Accessibility permission",
      severity: "required",
    });
  }

  return uniqueRequirements(requirements);
};

const validateHostPort = (host: string, port: number): string | undefined => {
  if (host.trim().length === 0) {
    return "xTool CDP host must not be empty.";
  }

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    return "xTool CDP port must be an integer between 1 and 65535.";
  }

  return undefined;
};

const isTcpPortOpen = (
  host: string,
  port: number,
  timeoutMs = 300,
): Promise<boolean> =>
  new Promise((resolvePort) => {
    const socket = new Socket();
    let settled = false;
    const done = (open: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolvePort(open);
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
    socket.connect(port, host);
  });

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

export const runPreflightRequirement = (
  requirement: PreflightRequirement,
): Effect.Effect<PreflightResult> =>
  Effect.gen(function* () {
    switch (requirement.type) {
      case "executable": {
        const resolved = resolveExecutableDependency(requirement.value);
        return resolved.status === "found"
          ? pass(requirement, `Found ${resolved.path}.`)
          : fail(requirement, resolved.message, resolved.detail);
      }

      case "app": {
        const resolved = resolveAppDependency(requirement.value);
        return resolved.status === "found"
          ? pass(requirement, `Found ${resolved.path}.`)
          : fail(requirement, resolved.message, resolved.detail);
      }

      case "accessibility":
        return yield* preflightAccessibility().pipe(
          Effect.as(
            pass(
              requirement,
              "Accessibility access is granted for the current runner.",
            ),
          ),
          Effect.catch((error) =>
            Effect.succeed(
              fail(
                requirement,
                error instanceof Error ? error.message : String(error),
              ),
            ),
          ),
        );

      case "xtool-cdp-config": {
        const invalid = validateHostPort(requirement.host, requirement.port);
        return invalid
          ? fail(requirement, invalid)
          : pass(
              requirement,
              `${requirement.host}:${requirement.port} is a valid CDP endpoint.`,
            );
      }

      case "tcp-port-warning": {
        const invalid = validateHostPort(requirement.host, requirement.port);
        if (invalid) {
          return {
            id: requirement.id,
            label: requirement.label,
            severity: requirement.severity,
            status: "skip",
            message: "Skipped because the CDP host/port is invalid.",
          };
        }

        const open = yield* Effect.promise(() =>
          isTcpPortOpen(requirement.host, requirement.port),
        );
        return open
          ? fail(
              requirement,
              `${requirement.host}:${requirement.port} already accepts connections.`,
              "If xTool Studio is already open, flatmaxx will ask you to close it before launching its own session.",
            )
          : pass(
              requirement,
              `${requirement.host}:${requirement.port} is not currently in use.`,
            );
      }
    }
  });

export const preflightFailures = (report: PreflightReport) =>
  report.results.filter(
    (result) => result.severity === "required" && result.status === "fail",
  );

export class PreflightError extends Error {
  constructor(readonly report: PreflightReport) {
    super(
      [
        "Preflight checks failed:",
        ...preflightFailures(report).map(
          (result) => `- ${result.label}: ${result.message}`,
        ),
      ].join("\n"),
    );
    this.name = "PreflightError";
  }
}

export const failIfPreflightFailed = (
  report: PreflightReport,
): Effect.Effect<PreflightReport, PreflightError> => {
  const failures = preflightFailures(report);
  return failures.length === 0
    ? Effect.succeed(report)
    : Effect.fail(new PreflightError(report));
};

const statusLabel = (status: PreflightStatus) => {
  switch (status) {
    case "pass":
      return "PASS";
    case "fail":
      return "FAIL";
    case "warn":
      return "WARN";
    case "skip":
      return "SKIP";
  }
};

const statusColor = (status: PreflightStatus) => {
  switch (status) {
    case "pass":
      return "green";
    case "fail":
      return "red";
    case "warn":
      return "yellow";
    case "skip":
      return "gray";
  }
};

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

export type RunPreflightOptions = {
  readonly title?: string | undefined;
  readonly render?: boolean | undefined;
};

export const runPreflight = Effect.fn("flatmaxx.preflight.run")(function* (
  config: ResolvedConfig,
  options: RunPreflightOptions = {},
) {
  const title = options.title ?? "Preflight checks";
  const requirements = buildPreflightRequirements(config);
  const results = yield* Effect.forEach(requirements, runPreflightRequirement);
  const report = { title, results } satisfies PreflightReport;

  if (options.render !== false) {
    yield* renderPreflightReport(report);
  }

  return yield* failIfPreflightFailed(report);
});
