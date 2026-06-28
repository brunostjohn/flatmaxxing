import { Effect } from "effect";
import { wordmarkText } from "./constants";
import { renderWordmark } from "./renderWordmark";

export const writeWordmark = Effect.fn(
  "flatmaxx.boardImagePreview.writeWordmark",
)(function* () {
  const wordmark = yield* Effect.sync(() => renderWordmark(wordmarkText));
  if (wordmark.lines.length === 0) {
    return;
  }
  yield* Effect.sync(() =>
    process.stdout.write(`${wordmark.lines.join("\n")}\n`),
  );
});
