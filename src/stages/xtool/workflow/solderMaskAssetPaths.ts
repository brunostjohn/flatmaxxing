import { resolve } from "node:path";
import { solderMaskSideConfig } from "./solderMaskSideConfig";
import type { SolderMaskSide } from "./types";

export function getSolderMaskDxfPath(
  projectPath: string,
  pcbName: string,
  side: SolderMaskSide,
) {
  const config = solderMaskSideConfig[side];
  return resolve(
    projectPath,
    "..",
    "dxf",
    `${pcbName}-${config.fileSuffix}.dxf`,
  );
}

export function getSolderMaskPngPath(
  projectPath: string,
  pcbName: string,
  side: SolderMaskSide,
) {
  const config = solderMaskSideConfig[side];
  return resolve(
    projectPath,
    "..",
    "png",
    `${pcbName}-${config.fileSuffix}.png`,
  );
}
