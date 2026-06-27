import { solderMaskPngZoom } from "@/stages/kicad/outputs/constants";
import type { SvgToPngResult } from "@/stages/kicad/outputs/types";
import { Resvg } from "@resvg/resvg-js";
import { Effect, FileSystem } from "effect";
import sharp, { type OutputInfo } from "sharp";

export const generatePngFromSvg = Effect.fn(
  "flatmaxx.generateKicadOutputs.generatePngFromSvg",
)(function* (
  svgFile: string,
  pngFile: string,
  options: { readonly zoom?: number | undefined } = {},
) {
  const fs = yield* FileSystem.FileSystem;

  const svg = yield* fs.readFileString(svgFile);
  const zoom = options.zoom ?? solderMaskPngZoom;

  const resvg = new Resvg(svg, {
    background: "rgba(255, 255, 255, 0)",
    fitTo: {
      mode: "zoom",
      value: zoom,
    },
    font: {
      loadSystemFonts: true,
    },
  });

  const pngData = yield* Effect.sync(() => resvg.render());
  const pngBuffer = yield* Effect.sync(() => pngData.asPng());
  const trimmed = yield* Effect.promise(() =>
    sharp(pngBuffer).trim().toBuffer({ resolveWithObject: true }),
  );

  yield* fs.writeFile(pngFile, trimmed.data);

  return {
    pngFile,
    info: trimmed.info,
  } satisfies SvgToPngResult;
});

export const formatPngTrimStatus = (info: OutputInfo): string => {
  const left = info.trimOffsetLeft ?? 0;
  const top = info.trimOffsetTop ?? 0;
  return `${info.width}x${info.height}px, trim x=${left} y=${top}`;
};
