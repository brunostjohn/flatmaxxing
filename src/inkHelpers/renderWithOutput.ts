import { Effect } from "effect";
import { type RenderOptions, render } from "ink";
import type { ReactNode } from "react";
import { RenderError } from "@/errors";

export const renderWithOutput = Effect.fn("flatmaxx.ink.renderWithOutput")(
  function* <O>(
    component: (send: (output: O) => void) => ReactNode,
    options?: RenderOptions,
  ) {
    return yield* Effect.callback<O, RenderError>((resume, signal) => {
      const onOutput = async (output: O) => {
        await waitUntilRenderFlush();
        unmount();
        resume(Effect.succeed(output));
        await waitUntilExit();
      };

      const { unmount, waitUntilRenderFlush, waitUntilExit } = render(
        component(onOutput),
        options,
      );

      signal.onabort = async () => {
        await waitUntilRenderFlush();
        unmount();
        resume(Effect.fail(new RenderError({ message: "Aborted" })));
        await waitUntilExit();
      };
    });
  },
);
