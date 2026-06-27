import type { CncJobPlan } from "@/cnc/cncJobPlan";
import type { Side } from "@/config";
import type { Effect } from "effect";

export interface BoardBounds {
  readonly xmin: number;
  readonly ymin: number;
  readonly xmax: number;
  readonly ymax: number;
}

export interface DrillPoint {
  readonly x: number;
  readonly y: number;
}

export interface ToolSection {
  readonly toolNumber: number;
  readonly label: string;
  readonly spindleSpeed: number;
  readonly travelZ: number;
  readonly body: readonly string[];
}

export interface AssembleOptions {
  readonly seamZ: number;
  readonly endZ: number;
  readonly headerComments: readonly string[];
}

export interface SideGerber {
  readonly side: Side;
  readonly copperGerber: string;
}

export interface FlatcamScriptInput {
  readonly sides: readonly SideGerber[];
  readonly edgeCutsGerber: string;
  readonly mirrorAxis: "X" | "Y";
  readonly plan: CncJobPlan;
  readonly scratchDir: string;
  readonly boundsFile: string;
  readonly doneFile: string;
}

export interface RunFlatcamOptions {
  readonly flatcam: string;
  readonly shellFile: string;
  readonly logFile: string;
  readonly doneFile: string;
  readonly timeoutSeconds?: number;
  readonly onProgress?: (line: string) => Effect.Effect<void>;
}
