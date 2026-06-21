import { Spinner, StatusMessage } from "@inkjs/ui";
import { Effect } from "effect";
import { render } from "ink";

interface RenderWaitingOptions {
	success?: string;
	error?: string;
	loading?: string;
	warning?: string;
}

export const renderWaiting = Effect.fn("flatmaxx.ink.renderWaiting")(
	function* ({ success, error, loading, warning }: RenderWaitingOptions) {
		const { unmount, waitUntilExit, waitUntilRenderFlush, rerender } = render(
			<Spinner label={loading} type="dots" />,
		);

		return [
			Effect.fn("flatmaxx.ink.renderWaiting.success")(function* (
				customMessage?: string,
			) {
				yield* Effect.sync(() =>
					rerender(
						<StatusMessage variant="success">
							{customMessage ?? success}
						</StatusMessage>,
					),
				);
				yield* Effect.promise(() => waitUntilRenderFlush());
				yield* Effect.sync(() => unmount());
				yield* Effect.promise(() => waitUntilExit());
			}),
			Effect.fn("flatmaxx.ink.renderWaiting.error")(function* (
				customMessage?: string,
			) {
				yield* Effect.sync(() =>
					rerender(
						<StatusMessage variant="error">
							{customMessage ?? error}
						</StatusMessage>,
					),
				);
				yield* Effect.promise(() => waitUntilRenderFlush());
				yield* Effect.sync(() => unmount());
				yield* Effect.promise(() => waitUntilExit());
			}),
			Effect.gen(function* () {
				yield* Effect.sync(() => unmount());
				yield* Effect.promise(() => waitUntilExit());
			}),
			Effect.fn("flatmaxx.ink.renderWaiting.warning")(function* (
				customMessage?: string,
			) {
				yield* Effect.sync(() =>
					rerender(
						<StatusMessage variant="warning">
							{customMessage ?? warning}
						</StatusMessage>,
					),
				);
				yield* Effect.promise(() => waitUntilRenderFlush());
				yield* Effect.sync(() => unmount());
				yield* Effect.promise(() => waitUntilExit());
			}),
		] as const;
	},
);
