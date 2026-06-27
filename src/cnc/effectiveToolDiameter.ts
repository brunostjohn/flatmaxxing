import type { CncToolOptions } from "@/config";

export const effectiveToolDiameter = (
  tool: CncToolOptions,
  cutDepth: number,
): number => {
  if (tool.type !== "vbit") return tool.diameter;

  const halfAngleRad = (tool.angle / 2) * (Math.PI / 180);
  return tool.diameter + 2 * Math.abs(cutDepth) * Math.tan(halfAngleRad);
};
