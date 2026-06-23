import type { Rect } from "@/macos";

export type MakeracamStep = "plated" | "final";

export type ToolpathKind = "drill" | "pocket" | "contour";

export interface MakeracamStepOptions {
  readonly enabled: boolean;
  readonly step: MakeracamStep;
  readonly appPath: string;
  readonly cutDepthMm: number;
  readonly tabsPerContour: number;
  readonly drillsDir: string;
  readonly gcodeDir: string;
  readonly cncDir: string;
  readonly windowBounds: Rect;
}

export interface PlannedToolpath {
  readonly file: string;
  readonly absPath: string;
  readonly kind: ToolpathKind;
  readonly category: string;
  readonly method: string;
  readonly diameterMm: number;
}

export interface ParsedDrillFilename {
  readonly board: string;
  readonly category: string;
  readonly method: string;
  readonly diameterMm: number;
}
