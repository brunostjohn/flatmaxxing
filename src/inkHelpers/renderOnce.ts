import { Effect } from "effect";
import { type RenderOptions, render } from "ink";
import type { ReactNode } from "react";

export const renderOnce = Effect.fn("flatmaxx.ink.renderOnce")(function* (
	component: ReactNode,
	options?: RenderOptions,
) {
	yield* Effect.callback<void>((resume, signal) => {
		const { unmount, waitUntilRenderFlush, waitUntilExit } = render(
			component,
			options,
		);

		signal.onabort = async () => {
			await waitUntilRenderFlush();
			unmount();
			resume(Effect.succeed(undefined));
			await waitUntilExit();
		};

		const complete = async () => {
			await waitUntilRenderFlush();
			unmount();
			resume(Effect.succeed(undefined));
			await waitUntilExit();
		};

		complete();
	});
});
