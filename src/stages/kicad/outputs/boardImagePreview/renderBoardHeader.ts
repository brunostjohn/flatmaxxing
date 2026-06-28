import { Effect, FileSystem, Match, Option } from "effect";
import { detectInlineImageProtocol } from "./detectInlineImageProtocol";
import { writeInlineImage } from "./writeInlineImage";
import { writeWordmark } from "./writeWordmark";

const headerContent = Effect.fn("flatmaxx.boardImagePreview.header")(function* (
  pngPath: Option.Option<string>,
) {
  const fs = yield* FileSystem.FileSystem;
  const imagePath = Option.getOrUndefined(pngPath);

  const graphics = Match.value(detectInlineImageProtocol()).pipe(
    Match.whenOr("kitty", "iterm2", (protocol) => Option.some(protocol)),
    Match.orElse(() => Option.none<"kitty" | "iterm2">()),
  );

  const imageReady = yield* Match.value(imagePath).pipe(
    Match.when(Match.string, (path) => fs.exists(path)),
    Match.orElse(() => Effect.succeed(false)),
  );

  if (Option.isSome(graphics) && imagePath !== undefined && imageReady) {
    yield* writeInlineImage(imagePath, graphics.value);
    return;
  }

  yield* writeWordmark();
});

export const renderBoardHeader = (pngPath: Option.Option<string>) =>
  headerContent(pngPath).pipe(Effect.catch(() => writeWordmark()));
