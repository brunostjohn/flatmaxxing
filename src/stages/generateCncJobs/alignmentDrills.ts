import { renderExcellon } from "@/stages/categorizeDrills/renderExcellon";
import { Array } from "effect";
import type { BoardBounds, DrillPoint } from "./types";

export type { BoardBounds, DrillPoint } from "./types";

export const alignmentDrillPoints = (
  bounds: BoardBounds,
  distance: { readonly x: number; readonly y: number },
): readonly DrillPoint[] => {
  const { xmin, ymin, xmax, ymax } = bounds;
  const dx = distance.x;
  const dy = distance.y;
  return [
    { x: xmin - dx, y: ymin - dy },
    { x: xmax + dx, y: ymin - dy },
    { x: xmin - dx, y: ymax + dy },
    { x: xmax + dx, y: ymax + dy },
  ];
};

export const renderAlignmentExcellon = (
  points: readonly DrillPoint[],
  diameter: number,
): string =>
  renderExcellon(
    Array.map(points, (p) => ({
      kind: "circle",
      plating: "unknown",
      diameter,
      x: p.x,
      y: p.y,
      tool: 1,
    })),
  );
