import { effectiveToolDiameter } from "@/cnc/effectiveToolDiameter";
import type { NccMethod, ResolvedConfig } from "@/config";

/** Trim to 4 decimals and drop trailing zeros for human-readable labels. */
export const formatDia = (value: number): string =>
  Number.parseFloat(value.toFixed(4)).toString();

export interface NccToolStep {
  /**
   * 1-based position in the FlatCAM `-tooldia` list. After `split_geometry`
   * the per-tool object is named `{ncc}_tool_{uid}`, so this is how we target
   * each tool's `cncjob`. Only tools that actually clear copper produce an
   * object (FlatCAM drops empty ones), so downstream code must tolerate gaps.
   */
  readonly uid: number;
  readonly kind: "mill" | "vbit";
  /** Diameter for `-tooldia`/`cncjob -dia`. For the V-bit this is the effective width. */
  readonly diameter: number;
  /** Positive cut depth (mm). */
  readonly cutDepth: number;
  /** XY cutting feedrate for this tool's cncjob. */
  readonly feedRate: number;
  /** Z plunge feedrate for this tool's cncjob. */
  readonly zCutFeedRate: number;
  /** Spindle speed for this tool. */
  readonly spindleSpeed: number;
  readonly label: string;
}

export interface IsolationPlan {
  /** Effective V-bit cutting width at `cutDepth`. */
  readonly diameter: number;
  readonly cutDepth: number;
  readonly passes: number;
  readonly overlap: number;
  readonly isoType: number;
  readonly feedRate: number;
  readonly zCutFeedRate: number;
  readonly spindleSpeed: number;
  readonly label: string;
}

export interface NccPlan {
  /** Ordered biggest→smallest, V-bit last (the fine finish). */
  readonly tools: readonly NccToolStep[];
  readonly overlap: number;
  readonly margin: number;
  readonly method: NccMethod;
  readonly feedRate: number;
  readonly zCutFeedRate: number;
  readonly spindleSpeed: number;
}

export interface CncJobPlan {
  readonly isolation: IsolationPlan;
  readonly ncc: NccPlan;
  readonly clearance: ResolvedConfig["cnc"]["clearance"];
}

/**
 * Resolves the per-side CNC operations from config:
 *  - isolation with the V-bit (effective width at its cut depth), and
 *  - non-copper clearing as a non-rest multi-tool job over every available mill
 *    (biggest→smallest) plus the V-bit appended last as the fine finish.
 *
 * FlatCAM's non-rest path already clears complementary "rest" areas between
 * tools, so the broken `-rest` flag is unnecessary. Every tool has its own RPM
 * and feeds: each mill resolves from its `availableMills` override → falls back
 * to `cnc.nonCopperClearing`; the V-bit isolation pass uses `cnc.isolation`; the
 * V-bit NCC-finish pass uses `cnc.nonCopperClearing` (independent of isolation).
 */
export const buildCncJobPlan = (config: ResolvedConfig): CncJobPlan => {
  const iso = config.cnc.isolation;
  const ncc = config.cnc.nonCopperClearing;
  const isoTool = iso.tool;

  if (!isoTool) {
    throw new Error(
      "cnc.isolation.tool is required to generate CNC jobs (configure a V-bit).",
    );
  }

  const isoDiameter = effectiveToolDiameter(isoTool, iso.zCutDepth);

  const mills = [...config.cnc.availableMills].sort(
    (a, b) => b.diameter - a.diameter,
  );

  const tools: NccToolStep[] = [];
  let uid = 0;
  for (const mill of mills) {
    uid += 1;
    tools.push({
      uid,
      kind: "mill",
      diameter: mill.diameter,
      cutDepth: mill.zCutDepth ?? ncc.millZCutDepth,
      feedRate: mill.feedRate ?? ncc.feedRate,
      zCutFeedRate: mill.zCutFeedRate ?? ncc.zCutFeedRate,
      spindleSpeed: mill.spindleSpeed ?? ncc.spindleSpeed,
      label: `${formatDia(mill.diameter)}mm mill`,
    });
  }
  // V-bit NCC finish: the same physical bit as isolation, but a separate NCC
  // operation — its feeds, RPM and depth come from cnc.nonCopperClearing so it
  // is tuned independently from the isolation pass (notably a different spindle
  // RPM, since wrong RPM under the heavier clearing load can break the bit).
  uid += 1;
  const nccVbitDiameter = effectiveToolDiameter(isoTool, ncc.zCutDepth);
  tools.push({
    uid,
    kind: "vbit",
    diameter: nccVbitDiameter,
    cutDepth: ncc.zCutDepth,
    feedRate: ncc.feedRate,
    zCutFeedRate: ncc.zCutFeedRate,
    spindleSpeed: ncc.spindleSpeed,
    label: `${formatDia(nccVbitDiameter)}mm V-bit`,
  });

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
      tools,
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
