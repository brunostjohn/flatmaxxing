import { Effect, Match } from "effect";
import { detectInlineImageProtocol } from "./detectInlineImageProtocol";
import { writeInlineImage } from "./writeInlineImage";

export const renderBoardImagePreview = Effect.fn(
  "flatmaxx.boardImagePreview.render",
)(function* (pngPath: string) {
  yield* Match.value(detectInlineImageProtocol()).pipe(
    Match.whenOr("kitty", "iterm2", (protocol) =>
      writeInlineImage(pngPath, protocol).pipe(Effect.catch(() => Effect.void)),
    ),
    Match.orElse(() => Effect.void),
  );
});
