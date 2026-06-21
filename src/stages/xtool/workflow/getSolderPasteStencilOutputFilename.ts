import { solderPasteStencilSideConfig } from "./solderPasteStencilSideConfig";
import type { SolderPasteStencilSide } from "./types";

export function getSolderPasteStencilOutputFilename(
	pcbName: string,
	side: SolderPasteStencilSide,
) {
	return `${pcbName}-${solderPasteStencilSideConfig[side].fileSuffix}.xs`;
}
