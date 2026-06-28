import { solderMaskPngZoom } from "@/stages/kicad/outputs/constants";
import type {
  PngTrimInfo,
  SvgToPngResult,
} from "@/stages/kicad/outputs/types";
import { Resvg } from "@resvg/resvg-js";
import { Effect, FileSystem } from "effect";
import { Jimp } from "jimp";

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

  const pngBuffer = yield* Effect.sync(() => resvg.render().asPng());
  const image = yield* Effect.promise(() => Jimp.read(pngBuffer));
  yield* Effect.sync(() => image.autocrop({ cropOnlyFrames: false }));
  const out = yield* Effect.promise(() => image.getBuffer("image/png"));

  yield* fs.writeFile(pngFile, out);

  return {
    pngFile,
    info: { width: image.bitmap.width, height: image.bitmap.height },
  } satisfies SvgToPngResult;
});

export const formatPngTrimStatus = (info: PngTrimInfo) =>
  `${info.width}x${info.height}px`;
