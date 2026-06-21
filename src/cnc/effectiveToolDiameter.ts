import type { CncToolOptions } from "@/config";

/**
 * The cutting-width diameter a tool actually produces at a given cut depth.
 *
 * FlatCAM's GUI computes this for V-shaped bits, but the Tcl `isolate`/`ncc`
 * commands only accept a flat `-dia`, so we must compute it ourselves and pass
 * it in. For a V-bit the engraved width grows with depth:
 *
 *   effective = tip_dia + 2 * |cutZ| * tan(tip_angle / 2)
 *
 * (mirrors appPlugins/ToolIsolation.py `new_tooldia`). Flat tools (mills,
 * drills) cut at their nominal diameter regardless of depth.
 */
export const effectiveToolDiameter = (
	tool: CncToolOptions,
	cutDepth: number,
): number => {
	if (tool.type === "vbit") {
		const halfAngleRad = (tool.angle / 2) * (Math.PI / 180);
		return tool.diameter + 2 * Math.abs(cutDepth) * Math.tan(halfAngleRad);
	}

	return tool.diameter;
};
