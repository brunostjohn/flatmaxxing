import { dxfBounds, dxfHasPlottableGeometry } from "@/compute";
import DxfParser from "dxf-parser";
import { Effect, FileSystem } from "effect";

export const parseDxfString = Effect.fn("flatmaxx.xtool.parseDxfString")(
  function* (dxfFile: string) {
    return yield* Effect.try({
      try: () => {
        const parser = new DxfParser();
        const dxf = parser.parseSync(dxfFile);
        if (!dxf) {
          throw new Error("Failed to parse DXF file.");
        }
        return dxf;
      },
      catch: (cause) =>
        cause instanceof Error ? cause : new Error(String(cause)),
    });
  },
);

export const readParsedDxfFile = Effect.fn("flatmaxx.xtool.readParsedDxfFile")(
  function* (dxfPath: string) {
    const fs = yield* FileSystem.FileSystem;
    const dxfFile = yield* fs.readFileString(dxfPath);
    return yield* parseDxfString(dxfFile);
  },
);

export const dxfBoundsFile = Effect.fn("flatmaxx.xtool.dxfBoundsFile")(
  function* (dxfPath: string) {
    const dxf = yield* readParsedDxfFile(dxfPath);
    return yield* dxfBounds(dxf);
  },
);

export const dxfFileHasPlottableGeometry = Effect.fn(
  "flatmaxx.xtool.dxfFileHasPlottableGeometry",
)(function* (dxfPath: string) {
  const dxf = yield* readParsedDxfFile(dxfPath);
  return yield* dxfHasPlottableGeometry(dxf);
});
