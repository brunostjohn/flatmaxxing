import { Effect, FileSystem, Option } from "effect";
import { composePreview } from "./composePreview";
import { computePreviewSize } from "./computePreviewSize";
import {
  defaultCellAspect,
  defaultTerminalColumns,
  wordmarkText,
} from "./constants";
import { parsePngDimensions } from "./parsePngDimensions";
import { queryCellAspect } from "./queryCellAspect";
import { renderWordmark } from "./renderWordmark";
import { toBase64 } from "./utils";

export const writeInlineImage = Effect.fn(
  "flatmaxx.boardImagePreview.writeInline",
)(function* (pngPath: string, protocol: "kitty" | "iterm2") {
  const fs = yield* FileSystem.FileSystem;
  const bytes = yield* fs.readFile(pngPath);

  yield* Option.match(parsePngDimensions(bytes), {
    onNone: () => Effect.void,
    onSome: (dimensions) =>
      Effect.gen(function* () {
        const cellAspect = yield* queryCellAspect(defaultCellAspect);
        const base64 = yield* Effect.sync(() => toBase64(bytes));
        const wordmark = yield* Effect.sync(() => renderWordmark(wordmarkText));
        const terminalColumns =
          process.stdout.columns ?? defaultTerminalColumns;
        const size = computePreviewSize({
          ...dimensions,
          terminalColumns,
          cellAspect,
        });
        const sequence = composePreview({
          protocol,
          base64,
          byteLength: bytes.length,
          size,
          wordmark,
          terminalColumns,
        });
        yield* Effect.sync(() => process.stdout.write(sequence));
      }),
  });
});
