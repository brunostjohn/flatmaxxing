import type { Option } from "effect";

export type Plating = "PTH" | "NPTH" | "unknown";

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface CircleHole {
  readonly kind: "circle";
  readonly plating: Plating;
  readonly diameter: number;
  readonly x: number;
  readonly y: number;
  readonly tool: number;
}

export interface SlotHole {
  readonly kind: "slot";
  readonly plating: Plating;
  readonly width: number;
  readonly path: readonly Point[];
  readonly length: number;
  readonly tool: number;
}

export type Hole = CircleHole | SlotHole;

export type Units = "metric" | "inch";

export interface ParsedExcellon {
  readonly units: Units;
  readonly holes: readonly Hole[];
}

export interface ToolDef {
  readonly diameter: number;
  readonly plating: Plating;
}

export type ExcellonToken =
  | { readonly _tag: "Units"; readonly units: Units }
  | { readonly _tag: "Plating"; readonly plating: Plating }
  | {
      readonly _tag: "ToolDef";
      readonly tool: number;
      readonly diameter: number;
    }
  | { readonly _tag: "Select"; readonly tool: number }
  | {
      readonly _tag: "Move";
      readonly rapid: boolean;
      readonly x: Option.Option<number>;
      readonly y: Option.Option<number>;
    }
  | { readonly _tag: "PlungeStart" }
  | { readonly _tag: "PlungeEnd" }
  | {
      readonly _tag: "Drill";
      readonly x: Option.Option<number>;
      readonly y: Option.Option<number>;
    }
  | { readonly _tag: "Ignored" };

export interface ParseState {
  readonly units: Units;
  readonly pendingPlating: Plating;
  readonly tools: Readonly<Record<string, ToolDef>>;
  readonly currentTool: Option.Option<number>;
  readonly lastX: number;
  readonly lastY: number;
  readonly route: Option.Option<readonly Point[]>;
  readonly holes: readonly Hole[];
}

export interface ToolDiameter {
  readonly diameter: number;
}

export type Method = "drill" | "pocket";

export interface ToolInventory {
  readonly drills: readonly ToolDiameter[];
  readonly mills: readonly ToolDiameter[];
  readonly toleranceMm: number;
}

export type ResolveResult =
  | {
      readonly ok: true;
      readonly method: Method;
      readonly toolDiameter: number;
      readonly roundedUp: boolean;
    }
  | { readonly ok: false; readonly reason: string };

export interface CategorizedGroup {
  readonly category: string;
  readonly method: Method;
  readonly toolDiameter: number;
  readonly fileSuffix: string;
  readonly holes: readonly Hole[];
}

export interface RoundUpEvent {
  readonly category: string;
  readonly plating: Plating;
  readonly x: number;
  readonly y: number;
  readonly trueDiameter: number;
  readonly bitDiameter: number;
  readonly delta: number;
}

export interface UnmachinableHole {
  readonly hole: Hole;
  readonly category: string;
  readonly reason: string;
}

export interface CategorizeResult {
  readonly groups: readonly CategorizedGroup[];
  readonly unmachinable: readonly UnmachinableHole[];
  readonly roundUps: readonly RoundUpEvent[];
}

export interface ResolvedHole {
  readonly hole: Hole;
  readonly category: string;
  readonly result: ResolveResult;
}

export interface SizeTool {
  readonly diameter: number;
  readonly plating: Plating;
  readonly circles: readonly Point[];
  readonly slots: readonly (readonly Point[])[];
}
