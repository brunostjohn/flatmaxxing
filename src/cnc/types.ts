import type { NccMethod, ResolvedConfig } from "@/config";

export interface NccToolStep {
  readonly uid: number;
  readonly kind: "mill" | "vbit";
  readonly diameter: number;
  readonly cutDepth: number;
  readonly feedRate: number;
  readonly zCutFeedRate: number;
  readonly spindleSpeed: number;
  readonly label: string;
}

export interface IsolationPlan {
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
