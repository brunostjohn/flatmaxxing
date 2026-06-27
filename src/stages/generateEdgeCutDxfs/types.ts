import type { Coordinate } from "@/geometry/dxfWriter";

export interface PlatingBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export interface PlatingOffsets {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

export interface AlignmentDistance {
  readonly x: number;
  readonly y: number;
}

export interface PlatingLayoutOptions {
  readonly offsets: PlatingOffsets;
  readonly includeAlignmentDrills: boolean;
  readonly alignmentDistance: AlignmentDistance;
}

export interface PlatingLayout {
  readonly boardBounds: PlatingBounds;
  readonly baseBounds: PlatingBounds;
  readonly bounds: PlatingBounds;
  readonly alignmentPoints: readonly Coordinate[];
  readonly widthMm: number;
  readonly heightMm: number;
}

export interface EdgeCutDxfOptions {
  readonly enabled: boolean;
  readonly platingOffsets: PlatingOffsets;
  readonly cornerRadius: number;
  readonly includeAlignmentDrills: boolean;
  readonly alignmentDistance: AlignmentDistance;
  readonly gerbersDir: string;
}
