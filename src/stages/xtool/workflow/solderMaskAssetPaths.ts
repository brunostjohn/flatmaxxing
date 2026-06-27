import { Effect, Path } from "effect";
import { solderMaskSideConfig } from "./solderMaskSideConfig";
import type { SolderMaskSide } from "./types";

export const getSolderMaskDxfPath = Effect.fn(
  "flatmaxx.xtool.getSolderMaskDxfPath",
)(function* (projectPath: string, pcbName: string, side: SolderMaskSide) {
  const path = yield* Path.Path;
  const config = solderMaskSideConfig[side];
  return path.resolve(
    projectPath,
    "..",
    "dxf",
    `${pcbName}-${config.fileSuffix}.dxf`,
  );
});

export const getSolderMaskPngPath = Effect.fn(
  "flatmaxx.xtool.getSolderMaskPngPath",
)(function* (projectPath: string, pcbName: string, side: SolderMaskSide) {
  const path = yield* Path.Path;
  const config = solderMaskSideConfig[side];
  return path.resolve(
    projectPath,
    "..",
    "png",
    `${pcbName}-${config.fileSuffix}.png`,
  );
});
