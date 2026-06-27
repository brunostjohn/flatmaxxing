import { Effect } from "effect";
import { type RenderOptions, render } from "ink";
import type { ReactNode } from "react";
import { RenderError } from "@/errors";

export const renderOnce = Effect.fn("flatmaxx.ink.renderOnce")(function* (
  component: ReactNode,
  options?: RenderOptions,
) {
  yield* Effect.callback<void, RenderError>((resume, signal) => {
    const { unmount, waitUntilRenderFlush, waitUntilExit } = render(
      component,
      options,
    );

    const settle = (result: Effect.Effect<void, RenderError>) => async () => {
      await waitUntilRenderFlush();
      unmount();
      resume(result);
      await waitUntilExit();
    };

    signal.onabort = settle(
      Effect.fail(new RenderError({ message: "Aborted" })),
    );
    settle(Effect.succeed(undefined))();
  });
});
