import { resolve } from "node:path";
import { solderPasteStencilSideConfig } from "./solderPasteStencilSideConfig";
import type { SolderPasteStencilSide } from "./types";

export function getSolderPasteStencilDxfPath(
  projectPath: string,
  pcbName: string,
  side: SolderPasteStencilSide,
) {
  const config = solderPasteStencilSideConfig[side];

  return resolve(
    projectPath,
    "..",
    "dxf",
    `${pcbName}-${config.fileSuffix}.dxf`,
  );
}
