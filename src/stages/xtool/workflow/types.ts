import type { TaskScope } from "@/inkHelpers";

export type RectBounds = {
	x: number;
	y: number;
	width: number;
	height: number;
};

export type SolderMaskBounds = { width: number; height: number };

export type SolderMaskPasteOffsets = {
	right?: number;
	bottom?: number;
};

export type SolderMaskSide = "front" | "back";

export type XToolTasks = TaskScope;
