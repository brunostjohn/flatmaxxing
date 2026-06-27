import {
  buildXToolProjectOptions,
  defaultFlatcam,
  defaultKicadCli,
  type ResolvedConfig,
} from "@/config";
import { Array } from "effect";
import type { PreflightRequirement } from "./types";

export const isCncPreflightEnabled = (config: ResolvedConfig) =>
  config.cnc.isolation.tool !== undefined;

export const isMakeracamPreflightEnabled = (config: ResolvedConfig) =>
  config.makeracam.platedHoles.generate || config.makeracam.finalCut.generate;

export const isXToolPreflightEnabled = (config: ResolvedConfig) =>
  buildXToolProjectOptions(config).enabled;

const commandRequirement = (command: string): PreflightRequirement => ({
  type: "executable",
  id: `command:${command}`,
  label: `${command} command`,
  value: command,
  severity: "required",
});

const baseRequirements = (config: ResolvedConfig): PreflightRequirement[] => [
  {
    type: "executable",
    id: "dependency:kicad-cli",
    label: "KiCad CLI",
    value: config.dependencies.kicadCli ?? defaultKicadCli,
    severity: "required",
  },
];

const cncRequirements = (config: ResolvedConfig): PreflightRequirement[] => [
  {
    type: "executable",
    id: "dependency:flatcam",
    label: "FlatCAM",
    value: config.dependencies.flatcam ?? defaultFlatcam,
    severity: "required",
  },
  commandRequirement("sh"),
  commandRequirement("pkill"),
  commandRequirement("kill"),
];

const xToolRequirements = (config: ResolvedConfig): PreflightRequirement[] => [
  {
    type: "app",
    id: "dependency:xtool-studio",
    label: "xTool Studio app",
    value: config.xtool.appPath,
    severity: "required",
  },
  {
    type: "xtool-cdp-config",
    id: "xtool:cdp-config",
    label: "xTool CDP configuration",
    host: config.xtool.cdpHost,
    port: config.xtool.cdpPort,
    severity: "required",
  },
  {
    type: "tcp-port-warning",
    id: "xtool:cdp-port",
    label: "xTool CDP port availability",
    host: config.xtool.cdpHost,
    port: config.xtool.cdpPort,
    severity: "warning",
  },
];

const makeracamRequirements = (
  config: ResolvedConfig,
): PreflightRequirement[] => [
  {
    type: "app",
    id: "dependency:makeracam",
    label: "MakeraCAM app",
    value: config.makeracam.appPath,
    severity: "required",
  },
];

const macAutomationRequirements = (): PreflightRequirement[] => [
  commandRequirement("open"),
  commandRequirement("pgrep"),
  commandRequirement("osascript"),
  {
    type: "accessibility",
    id: "macos:accessibility",
    label: "macOS Accessibility permission",
    severity: "required",
  },
];

export const buildPreflightRequirements = (
  config: ResolvedConfig,
): readonly PreflightRequirement[] => {
  const cncEnabled = isCncPreflightEnabled(config);
  const xToolEnabled = isXToolPreflightEnabled(config);
  const makeracamEnabled = isMakeracamPreflightEnabled(config);
  const macAutomationEnabled = xToolEnabled || makeracamEnabled;

  return Array.dedupeWith(
    [
      ...baseRequirements(config),
      ...(cncEnabled ? cncRequirements(config) : []),
      ...(xToolEnabled ? xToolRequirements(config) : []),
      ...(makeracamEnabled ? makeracamRequirements(config) : []),
      ...(macAutomationEnabled ? macAutomationRequirements() : []),
    ],
    (a, b) => a.id === b.id,
  );
};
