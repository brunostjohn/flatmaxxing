import type { Coordinate, PathCmd } from "@/geometry/dxfWriter";
import { alignmentDrillPoints } from "@/stages/generateCncJobs/alignmentDrills";
import { Array } from "effect";
import type {
  PlatingBounds,
  PlatingLayout,
  PlatingLayoutOptions,
  PlatingOffsets,
} from "./types";

export type {
  PlatingBounds,
  PlatingLayout,
  PlatingLayoutOptions,
  PlatingOffsets,
} from "./types";

export const resolvePlatingAlignmentPoints = (
  bounds: PlatingBounds,
  options: Pick<
    PlatingLayoutOptions,
    "alignmentDistance" | "includeAlignmentDrills"
  >,
) =>
  options.includeAlignmentDrills
    ? alignmentDrillPoints(
        {
          xmin: bounds.minX,
          ymin: bounds.minY,
          xmax: bounds.maxX,
          ymax: bounds.maxY,
        },
        options.alignmentDistance,
      )
    : [];

export const expandPlatingBounds = (
  bounds: PlatingBounds,
  alignmentPoints: readonly Coordinate[],
  offsets: PlatingOffsets,
): PlatingBounds => {
  const unioned = Array.reduce(alignmentPoints, bounds, (acc, point) => ({
    minX: Math.min(acc.minX, point.x),
    minY: Math.min(acc.minY, point.y),
    maxX: Math.max(acc.maxX, point.x),
    maxY: Math.max(acc.maxY, point.y),
  }));

  return {
    minX: unioned.minX - offsets.left,
    minY: unioned.minY - offsets.top,
    maxX: unioned.maxX + offsets.right,
    maxY: unioned.maxY + offsets.bottom,
  };
};

export const dimensionsOfPlatingBounds = (bounds: PlatingBounds) => ({
  widthMm: bounds.maxX - bounds.minX,
  heightMm: bounds.maxY - bounds.minY,
});

export const resolvePlatingLayout = (
  bounds: PlatingBounds,
  options: PlatingLayoutOptions,
): PlatingLayout => {
  const alignmentPoints = resolvePlatingAlignmentPoints(bounds, options);
  const baseBounds = expandPlatingBounds(bounds, alignmentPoints, {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  });
  const platingBounds = expandPlatingBounds(
    bounds,
    alignmentPoints,
    options.offsets,
  );
  const dimensions = dimensionsOfPlatingBounds(platingBounds);

  return {
    boardBounds: bounds,
    baseBounds,
    bounds: platingBounds,
    alignmentPoints,
    ...dimensions,
  };
};

const rectangleCmds = (bounds: PlatingBounds): PathCmd[] => [
  { kind: "line", to: { x: bounds.maxX, y: bounds.minY } },
  { kind: "line", to: { x: bounds.maxX, y: bounds.maxY } },
  { kind: "line", to: { x: bounds.minX, y: bounds.maxY } },
  { kind: "line", to: { x: bounds.minX, y: bounds.minY } },
];

const roundedRectCmds = (bounds: PlatingBounds, radius: number): PathCmd[] => {
  const { minX, minY, maxX, maxY } = bounds;
  return [
    { kind: "line", to: { x: maxX - radius, y: minY } },
    {
      kind: "arc",
      to: { x: maxX, y: minY + radius },
      center: { x: maxX - radius, y: minY + radius },
      cw: false,
    },
    { kind: "line", to: { x: maxX, y: maxY - radius } },
    {
      kind: "arc",
      to: { x: maxX - radius, y: maxY },
      center: { x: maxX - radius, y: maxY - radius },
      cw: false,
    },
    { kind: "line", to: { x: minX + radius, y: maxY } },
    {
      kind: "arc",
      to: { x: minX, y: maxY - radius },
      center: { x: minX + radius, y: maxY - radius },
      cw: false,
    },
    { kind: "line", to: { x: minX, y: minY + radius } },
    {
      kind: "arc",
      to: { x: minX + radius, y: minY },
      center: { x: minX + radius, y: minY + radius },
      cw: false,
    },
  ];
};

export const buildPlatingRoundedRect = (
  bounds: PlatingBounds,
  alignmentPoints: readonly Coordinate[],
  offsets: PlatingOffsets,
  cornerRadius: number,
) => {
  const expanded = expandPlatingBounds(bounds, alignmentPoints, offsets);
  const width = expanded.maxX - expanded.minX;
  const height = expanded.maxY - expanded.minY;
  const radius = Math.max(0, Math.min(cornerRadius, width / 2, height / 2));

  if (radius <= 0) {
    return {
      start: { x: expanded.minX, y: expanded.minY } satisfies Coordinate,
      cmds: rectangleCmds(expanded),
    };
  }

  return {
    start: { x: expanded.minX + radius, y: expanded.minY } satisfies Coordinate,
    cmds: roundedRectCmds(expanded, radius),
  };
};
