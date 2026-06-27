import { Spinner, StatusMessage } from "@inkjs/ui";
import { Effect } from "effect";
import { render } from "ink";
import type { ReactNode } from "react";
import type { RenderWaitingOptions, StatusVariant } from "./types";

export const renderWaiting = Effect.fn("flatmaxx.ink.renderWaiting")(
  function* ({ success, error, loading, warning }: RenderWaitingOptions) {
    const { unmount, waitUntilExit, waitUntilRenderFlush, rerender } = render(
      <Spinner label={loading} type="dots" />,
    );

    const flush = Effect.promise(() => waitUntilRenderFlush());
    const stop = Effect.gen(function* () {
      yield* Effect.sync(() => unmount());
      yield* Effect.promise(() => waitUntilExit());
    });

    const show = (component: ReactNode) =>
      Effect.gen(function* () {
        yield* Effect.sync(() => rerender(component));
        yield* flush;
        yield* stop;
      });

    const settle = (variant: StatusVariant, fallback?: string) =>
      Effect.fn(`flatmaxx.ink.renderWaiting.${variant}`)(function* (
        customMessage?: string,
      ) {
        yield* show(
          <StatusMessage variant={variant}>
            {customMessage ?? fallback}
          </StatusMessage>,
        );
      });

    return [
      settle("success", success),
      settle("error", error),
      stop,
      settle("warning", warning),
    ] as const;
  },
);
