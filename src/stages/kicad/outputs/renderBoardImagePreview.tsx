import { Duration, Effect } from "effect";
import { Box, render } from "ink";
import Image, { TerminalInfoProvider } from "ink-picture";

const previewWidth = () => {
  const columns = process.stdout.columns ?? 80;
  return Math.max(1, Math.min(80, columns - 2));
};

const BoardImagePreview = ({ pngPath }: { readonly pngPath: string }) => (
  <TerminalInfoProvider>
    <Box flexDirection="column" marginBottom={1}>
      <Image src={pngPath} width={previewWidth()} alt="Board image preview" />
    </Box>
  </TerminalInfoProvider>
);

export const renderBoardImagePreview = Effect.fn(
  "flatmaxx.boardImagePreview.render",
)(function* (pngPath: string) {
  yield* Effect.acquireUseRelease(
    Effect.sync(() => render(<BoardImagePreview pngPath={pngPath} />)),
    (instance) =>
      Effect.gen(function* () {
        yield* Effect.promise(() => instance.waitUntilRenderFlush());
        yield* Effect.sleep(Duration.millis(750));
      }),
    (instance) =>
      Effect.promise(async () => {
        await instance.waitUntilRenderFlush();
        instance.unmount();
        await instance.waitUntilExit();
      }),
  );
});
