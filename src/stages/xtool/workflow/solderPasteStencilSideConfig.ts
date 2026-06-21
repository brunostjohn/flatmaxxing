import { xToolTaskPaths } from "../tasks";
import type { SolderPasteStencilSide } from "./types";

export const solderPasteStencilSideConfig = {
	front: {
		label: "front",
		fileSuffix: "F_Paste",
		taskPaths: xToolTaskPaths.pasteStencils.front,
	},
	back: {
		label: "back",
		fileSuffix: "B_Paste",
		taskPaths: xToolTaskPaths.pasteStencils.back,
	},
} as const satisfies Record<
	SolderPasteStencilSide,
	{
		label: string;
		fileSuffix: string;
		taskPaths:
			| typeof xToolTaskPaths.pasteStencils.front
			| typeof xToolTaskPaths.pasteStencils.back;
	}
>;
