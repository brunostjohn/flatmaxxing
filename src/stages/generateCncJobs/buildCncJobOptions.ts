import { buildCncJobPlan, type CncJobPlan } from "@/cnc";
import {
  enabledSidesFromConfig,
  type ResolvedConfig,
  type Side,
} from "@/config";

export interface CncJobOptions {
  readonly enabled: boolean;
  readonly sides: readonly Side[];
  readonly plan: CncJobPlan;
  readonly mirrorAxis: "X" | "Y";
  readonly gcodeDir: string;
  readonly gerbersDir: string;
  readonly alignmentDrills: {
    readonly generate: boolean;
    readonly distance: { readonly x: number; readonly y: number };
    readonly diameter: number;
  };
}

export const buildCncJobOptions = (config: ResolvedConfig): CncJobOptions => ({
  enabled: config.cnc.isolation.tool !== undefined,
  sides: enabledSidesFromConfig(config),
  plan: buildCncJobPlan(config),
  mirrorAxis: config.cnc.backside.mirrorAxis,
  gcodeDir: config.paths.gcode,
  gerbersDir: config.paths.gerbers,
  alignmentDrills: {
    generate: config.alignmentDrills.generate,
    distance: config.alignmentDrills.distance,
    diameter: config.alignmentDrills.diameter,
  },
});
