import { Effect, Path } from "effect";
import { solderPasteStencilSideConfig } from "./solderPasteStencilSideConfig";
import type { SolderPasteStencilSide } from "./types";

export const getSolderPasteStencilDxfPath = Effect.fn(
  "flatmaxx.xtool.getSolderPasteStencilDxfPath",
)(function* (
  projectPath: string,
  pcbName: string,
  side: SolderPasteStencilSide,
) {
  const path = yield* Path.Path;
  const config = solderPasteStencilSideConfig[side];
  return path.resolve(
    projectPath,
    "..",
    "dxf",
    `${pcbName}-${config.fileSuffix}.dxf`,
  );
});
