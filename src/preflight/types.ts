export type PreflightSeverity = "required" | "warning";

export type PreflightStatus = "pass" | "fail" | "warn" | "skip";

export interface PreflightResult {
  readonly id: string;
  readonly label: string;
  readonly severity: PreflightSeverity;
  readonly status: PreflightStatus;
  readonly message: string;
  readonly detail?: string | undefined;
}

export interface PreflightReport {
  readonly title: string;
  readonly results: readonly PreflightResult[];
}

export type DependencyResolution =
  | {
      readonly status: "found";
      readonly path: string;
    }
  | {
      readonly status: "missing";
      readonly message: string;
      readonly detail?: string | undefined;
    };

interface ExecutableRequirement {
  readonly type: "executable";
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly severity: PreflightSeverity;
}

interface AppRequirement {
  readonly type: "app";
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly severity: PreflightSeverity;
}

interface AccessibilityRequirement {
  readonly type: "accessibility";
  readonly id: string;
  readonly label: string;
  readonly severity: PreflightSeverity;
}

interface XToolCdpConfigRequirement {
  readonly type: "xtool-cdp-config";
  readonly id: string;
  readonly label: string;
  readonly host: string;
  readonly port: number;
  readonly severity: PreflightSeverity;
}

interface TcpPortWarningRequirement {
  readonly type: "tcp-port-warning";
  readonly id: string;
  readonly label: string;
  readonly host: string;
  readonly port: number;
  readonly severity: PreflightSeverity;
}

export type PreflightRequirement =
  | ExecutableRequirement
  | AppRequirement
  | AccessibilityRequirement
  | XToolCdpConfigRequirement
  | TcpPortWarningRequirement;

export interface RunPreflightOptions {
  readonly title?: string | undefined;
  readonly render?: boolean | undefined;
}
