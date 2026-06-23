import type { Coordinate, PathCmd } from "@/geometry/dxfWriter";
import type { Outline } from "./extractEdgeCutsOutline";

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

export const buildPlatingRoundedRect = (
  bounds: PlatingBounds,
  alignmentPoints: readonly Coordinate[],
  offsets: PlatingOffsets,
  cornerRadius: number,
) => {
  let minX = bounds.minX;
  let minY = bounds.minY;
  let maxX = bounds.maxX;
  let maxY = bounds.maxY;

  for (const point of alignmentPoints) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  minX -= offsets.left;
  maxX += offsets.right;
  minY -= offsets.top;
  maxY += offsets.bottom;

  const width = maxX - minX;
  const height = maxY - minY;
  const radius = Math.max(0, Math.min(cornerRadius, width / 2, height / 2));

  if (radius <= 0) {
    const start: Coordinate = { x: minX, y: minY };
    const cmds: PathCmd[] = [
      { kind: "line", to: { x: maxX, y: minY } },
      { kind: "line", to: { x: maxX, y: maxY } },
      { kind: "line", to: { x: minX, y: maxY } },
      { kind: "line", to: { x: minX, y: minY } },
    ];
    return { start, cmds };
  }

  const start: Coordinate = { x: minX + radius, y: minY };

  const cmds: PathCmd[] = [
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

  return { start, cmds };
};
