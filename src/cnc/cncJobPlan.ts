import { effectiveToolDiameter } from "@/cnc/effectiveToolDiameter";
import type { ResolvedConfig } from "@/config";
import { CncError } from "@/errors";
import { Array, Order } from "effect";
import type { CncJobPlan, NccToolStep } from "./types";

const byDiameterDescending = Order.mapInput(
  Order.Number,
  (mill: { readonly diameter: number }) => -mill.diameter,
);

export type {
  CncJobPlan,
  IsolationPlan,
  NccPlan,
  NccToolStep,
} from "./types";

export const formatDia = (value: number): string =>
  Number.parseFloat(value.toFixed(4)).toString();

export const buildCncJobPlan = (config: ResolvedConfig): CncJobPlan => {
  const iso = config.cnc.isolation;
  const ncc = config.cnc.nonCopperClearing;
  const isoTool = iso.tool;

  if (!isoTool) {
    throw new CncError({
      message:
        "cnc.isolation.tool is required to generate CNC jobs (configure a V-bit).",
    });
  }

  const isoDiameter = effectiveToolDiameter(isoTool, iso.zCutDepth);

  const mills = Array.sort(config.cnc.availableMills, byDiameterDescending);

  const millTools: NccToolStep[] = Array.map(mills, (mill, index) => ({
    uid: index + 1,
    kind: "mill",
    diameter: mill.diameter,
    cutDepth: mill.zCutDepth ?? ncc.millZCutDepth,
    feedRate: mill.feedRate ?? ncc.feedRate,
    zCutFeedRate: mill.zCutFeedRate ?? ncc.zCutFeedRate,
    spindleSpeed: mill.spindleSpeed ?? ncc.spindleSpeed,
    label: `${formatDia(mill.diameter)}mm mill`,
  }));

  const nccVbitDiameter = effectiveToolDiameter(isoTool, ncc.zCutDepth);
  const vbitTool: NccToolStep = {
    uid: millTools.length + 1,
    kind: "vbit",
    diameter: nccVbitDiameter,
    cutDepth: ncc.zCutDepth,
    feedRate: ncc.feedRate,
    zCutFeedRate: ncc.zCutFeedRate,
    spindleSpeed: ncc.spindleSpeed,
    label: `${formatDia(nccVbitDiameter)}mm V-bit`,
  };

  return {
    isolation: {
      diameter: isoDiameter,
      cutDepth: iso.zCutDepth,
      passes: iso.passes,
      overlap: iso.overlap,
      isoType: iso.isoType,
      feedRate: iso.feedRate,
      zCutFeedRate: iso.zCutFeedRate,
      spindleSpeed: iso.spindleSpeed,
      label: `${formatDia(isoDiameter)}mm V-bit`,
    },
    ncc: {
      tools: [...millTools, vbitTool],
      overlap: ncc.overlap,
      margin: ncc.margin,
      method: ncc.method,
      feedRate: ncc.feedRate,
      zCutFeedRate: ncc.zCutFeedRate,
      spindleSpeed: ncc.spindleSpeed,
    },
    clearance: config.cnc.clearance,
  };
};
