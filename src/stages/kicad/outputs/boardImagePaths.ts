export const boardImageFileSuffix = "Board_Image";

export const getBoardImageSvgPath = (svgDir: string, pcbName: string) =>
  `${svgDir}/${pcbName}-${boardImageFileSuffix}.svg`;

export const getBoardImagePngPath = (pngDir: string, pcbName: string) =>
  `${pngDir}/${pcbName}-${boardImageFileSuffix}.png`;
