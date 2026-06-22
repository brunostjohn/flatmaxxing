import {
	axActions as axActionsNative,
	axFind as axFindNative,
	axPerformAction as axPerformActionNative,
	axPress as axPressNative,
	axRequestTrusted as axRequestTrustedNative,
	axSetValue as axSetValueNative,
	axTrusted as axTrustedNative,
	mouseClick as mouseClickNative,
	mouseDoubleClick as mouseDoubleClickNative,
	mouseMove as mouseMoveNative,
	mousePos as mousePosNative,
	mouseRightClick as mouseRightClickNative,
	mouseScroll as mouseScrollNative,
	screenCaptureGranted as screenCaptureGrantedNative,
	type AxQuery,
	type MousePos,
} from "@flatmaxxing/accessibility";
import { Effect, Option } from "effect";
import { AXError, MouseError } from "./errors";

export const axTrusted = Effect.fn("flatmaxx.macos.axTrusted")(function* () {
	return yield* Effect.sync(() => axTrustedNative());
});

export const axRequestTrusted = Effect.fn("flatmaxx.macos.axRequestTrusted")(
	function* () {
		return yield* Effect.sync(() => axRequestTrustedNative());
	},
);

export const screenCaptureGranted = Effect.fn(
	"flatmaxx.macos.screenCaptureGranted",
)(function* () {
	return yield* Effect.sync(() => screenCaptureGrantedNative());
});

export const axFind = Effect.fn("flatmaxx.macos.axFind")(function* (
	pid: number,
	query: AxQuery,
) {
	return yield* Effect.sync(() => axFindNative(pid, query)).pipe(
		Effect.map(Option.fromNullishOr),
	);
});

export const axPress = Effect.fn("flatmaxx.macos.axPress")(function* (
	pid: number,
	query: AxQuery,
) {
	return yield* Effect.try({
		try: () => axPressNative(pid, query),
		catch: (error) =>
			new AXError({
				message: "axPress failed",
				cause: error,
			}),
	});
});

export const axPerformAction = Effect.fn("flatmaxx.macos.axPerformAction")(
	function* (pid: number, query: AxQuery, action: string) {
		return yield* Effect.try({
			try: () => axPerformActionNative(pid, query, action),
			catch: (error) =>
				new AXError({
					message: "axPerformAction failed",
					cause: error,
				}),
		});
	},
);

export const axActions = Effect.fn("flatmaxx.macos.axActions")(function* (
	pid: number,
	query: AxQuery,
) {
	return yield* Effect.try({
		try: () => axActionsNative(pid, query),
		catch: (error) =>
			new AXError({
				message: "axActions failed",
				cause: error,
			}),
	});
});

export const axSetValue = Effect.fn("flatmaxx.macos.axSetValue")(function* (
	pid: number,
	query: AxQuery,
	value: string,
) {
	return yield* Effect.try({
		try: () => axSetValueNative(pid, query, value),
		catch: (error) =>
			new AXError({
				message: "axSetValue failed",
				cause: error,
			}),
	});
});

export const mousePos = Effect.fn("flatmaxx.macos.mousePos")(function* () {
	return yield* Effect.try({
		try: () => mousePosNative(),
		catch: (error) =>
			new MouseError({
				message: "mousePos failed",
				cause: error,
			}),
	});
});

export const mouseMove = Effect.fn("flatmaxx.macos.mouseMove")(function* (
	pos: MousePos,
) {
	return yield* Effect.try({
		try: () => mouseMoveNative(pos),
		catch: (error) =>
			new MouseError({
				message: "mouseMove failed",
				cause: error,
			}),
	});
});

export const mouseClick = Effect.fn("flatmaxx.macos.mouseClick")(function* (
	pos: MousePos,
) {
	return yield* Effect.tryPromise({
		try: () => mouseClickNative(pos),
		catch: (error) =>
			new MouseError({
				message: "mouseClick failed",
				cause: error,
			}),
	});
});

export const mouseRightClick = Effect.fn("flatmaxx.macos.mouseRightClick")(
	function* (pos: MousePos) {
		return yield* Effect.tryPromise({
			try: () => mouseRightClickNative(pos),
			catch: (error) =>
				new MouseError({
					message: "mouseRightClick failed",
					cause: error,
				}),
		});
	},
);

export const mouseDoubleClick = Effect.fn("flatmaxx.macos.mouseDoubleClick")(
	function* (pos: MousePos) {
		return yield* Effect.tryPromise({
			try: () => mouseDoubleClickNative(pos),
			catch: (error) =>
				new MouseError({
					message: "mouseDoubleClick failed",
					cause: error,
				}),
		});
	},
);

export const mouseScroll = Effect.fn("flatmaxx.macos.mouseScroll")(function* (
	pos: MousePos,
	lines: number,
) {
	return yield* Effect.tryPromise({
		try: () => mouseScrollNative(pos, lines),
		catch: (error) =>
			new MouseError({
				message: "mouseScroll failed",
				cause: error,
			}),
	});
});
