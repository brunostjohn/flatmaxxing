import { resolve } from "node:path";

export const boardImageFileSuffix = "Board_Image";

export const getBoardImageSvgPath = (svgDir: string, pcbName: string) =>
  resolve(svgDir, `${pcbName}-${boardImageFileSuffix}.svg`);

export const getBoardImagePngPath = (pngDir: string, pcbName: string) =>
  resolve(pngDir, `${pcbName}-${boardImageFileSuffix}.png`);
