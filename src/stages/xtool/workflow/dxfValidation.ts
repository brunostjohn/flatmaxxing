import { dxfBounds, dxfHasPlottableGeometry } from "@/compute";
import { DxfError, XToolError } from "@/errors";
import DxfParser from "dxf-parser";
import { Effect, FileSystem } from "effect";

const parseDxf = (dxfFile: string) => {
  const dxf = new DxfParser().parseSync(dxfFile);
  if (!dxf) {
    throw new DxfError({ message: "Failed to parse DXF file." });
  }
  return dxf;
};

export const parseDxfString = Effect.fn("flatmaxx.xtool.parseDxfString")(
  function* (dxfFile: string) {
    return yield* Effect.try({
      try: () => parseDxf(dxfFile),
      catch: (cause) =>
        new XToolError({ message: "Failed to parse DXF file.", cause }),
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
