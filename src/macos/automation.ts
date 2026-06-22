import { runAppleScript } from "@/utils";
import type { AxQuery } from "@flatmaxxing/accessibility";
import { Duration, Effect } from "effect";
import { ChildProcess } from "effect/unstable/process";
import { ElementNotFoundError, ScreenshotError } from "./errors";
import {
	axFind,
	axPerformAction,
	mouseClick,
	mouseDoubleClick,
	mouseRightClick,
} from "./nativeHelper";
import type { Rect } from "./types";

export {
	axActions,
	axFind,
	axTrusted,
	mouseClick as clickAt,
	mouseDoubleClick as doubleClickAt,
	mouseMove,
	mousePos,
	mouseScroll,
	axPerformAction as performAction,
	axPress as pressElement,
	mouseRightClick as rightClickAt,
	axSetValue as setElementValue,
} from "./nativeHelper";

export const showMenu = Effect.fn("flatmaxx.macos.showMenu")(function* (
	pid: number,
	query: AxQuery,
) {
	yield* axPerformAction(pid, query, "AXShowMenu");
});

export const pickElement = Effect.fn("flatmaxx.macos.pickElement")(function* (
	pid: number,
	query: AxQuery,
) {
	yield* axPerformAction(pid, query, "AXPick");
});

export const scrollToVisible = Effect.fn("flatmaxx.macos.scrollToVisible")(
	function* (pid: number, query: AxQuery) {
		yield* axPerformAction(pid, query, "AXScrollToVisible");
	},
);

const nthIndex = (q: AxQuery): number => (q.nth ?? 1) - 1;

export const findElement = Effect.fn("flatmaxx.macos.findElement")(function* (
	pid: number,
	query: AxQuery,
) {
	const els = yield* axFind(pid, query);

	const el = els?.[nthIndex(query)];
	if (el === undefined) {
		return yield* Effect.fail(
			new ElementNotFoundError({
				message: `no element for ${JSON.stringify(query)}`,
			}),
		);
	}
	return el;
});

export const elementExists = Effect.fn("flatmaxx.macos.elementExists")(
	function* (pid: number, query: AxQuery) {
		const els = yield* axFind(pid, query);
		if (!els) return false;

		return els.length > nthIndex(query);
	},
);

export const waitForElement = Effect.fn("flatmaxx.macos.waitForElement")(
	function* (
		pid: number,
		query: AxQuery,
		opts?: { readonly timeoutMs?: number; readonly everyMs?: number },
	) {
		const everyMs = opts?.everyMs ?? 200;
		const timeoutMs = opts?.timeoutMs ?? 10_000;
		const attempts = Math.max(1, Math.ceil(timeoutMs / everyMs));
		const idx = nthIndex(query);
		for (let i = 0; i < attempts; i++) {
			const els = yield* axFind(pid, query);
			const el = els?.[idx];
			if (el !== undefined) return el;
			yield* Effect.sleep(Duration.millis(everyMs));
		}
		return yield* Effect.fail(
			new ElementNotFoundError({
				message: `timed out (${timeoutMs}ms) waiting for ${JSON.stringify(query)}`,
			}),
		);
	},
);

export const waitForGone = Effect.fn("flatmaxx.macos.waitForGone")(function* (
	pid: number,
	query: AxQuery,
	opts?: { readonly timeoutMs?: number; readonly everyMs?: number },
) {
	const everyMs = opts?.everyMs ?? 200;
	const timeoutMs = opts?.timeoutMs ?? 10_000;
	const attempts = Math.max(1, Math.ceil(timeoutMs / everyMs));
	for (let i = 0; i < attempts; i++) {
		const els = yield* axFind(pid, query);
		if (!els || els.length === 0) return;
		yield* Effect.sleep(Duration.millis(everyMs));
	}
	return yield* Effect.fail(
		new ElementNotFoundError({
			message: `timed out (${timeoutMs}ms) waiting for ${JSON.stringify(query)} to disappear`,
		}),
	);
});

export const clickElement = Effect.fn("flatmaxx.macos.clickElement")(function* (
	pid: number,
	query: AxQuery,
) {
	const el = yield* findElement(pid, query);
	yield* mouseClick({ x: el.cx, y: el.cy });
	return el;
});

export const doubleClickElement = Effect.fn(
	"flatmaxx.macos.doubleClickElement",
)(function* (pid: number, query: AxQuery) {
	const el = yield* findElement(pid, query);
	yield* mouseDoubleClick({ x: el.cx, y: el.cy });
	return el;
});

export const rightClickElement = Effect.fn("flatmaxx.macos.rightClickElement")(
	function* (pid: number, query: AxQuery) {
		const el = yield* findElement(pid, query);
		yield* mouseRightClick({ x: el.cx, y: el.cy });
		return el;
	},
);

const escapeAppleScript = (s: string): string =>
	s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

export type Modifier = "command" | "shift" | "option" | "control";
const usingClause = (mods: readonly Modifier[]): string =>
	mods.length === 0
		? ""
		: ` using {${mods.map((m) => `${m} down`).join(", ")}}`;

export const typeText = Effect.fn("flatmaxx.macos.typeText")(function* (
	text: string,
) {
	yield* runAppleScript(
		`tell application "System Events" to keystroke "${escapeAppleScript(text)}"`,
	);
});

export const pressKeyCode = Effect.fn("flatmaxx.macos.pressKeyCode")(function* (
	keyCode: number,
	mods: readonly Modifier[] = [],
) {
	yield* runAppleScript(
		`tell application "System Events" to key code ${keyCode}${usingClause(mods)}`,
	);
});

export const pressReturn = Effect.fn("flatmaxx.macos.pressReturn")(
	function* () {
		yield* pressKeyCode(36);
	},
);
export const pressEscape = Effect.fn("flatmaxx.macos.pressEscape")(
	function* () {
		yield* pressKeyCode(53);
	},
);

export const goToPath = Effect.fn("flatmaxx.macos.goToPath")(function* (
	path: string,
) {
	yield* pressKeyCode(5, ["command", "shift"]);
	yield* Effect.sleep(Duration.millis(500));
	yield* typeText(path);
	yield* Effect.sleep(Duration.millis(250));
	yield* pressReturn();
});

export const ensureFrontmost = Effect.fn("flatmaxx.macos.ensureFrontmost")(
	function* (appName: string) {
		yield* runAppleScript(
			`tell application "System Events" to set frontmost of process "${appName}" to true`,
		);
	},
);

export const setWindowBounds = Effect.fn("flatmaxx.macos.setWindowBounds")(
	function* (appName: string, bounds: Rect) {
		yield* runAppleScript(
			`tell application "System Events" to tell process "${appName}"
\tset position of window 1 to {${bounds.x}, ${bounds.y}}
\tset size of window 1 to {${bounds.w}, ${bounds.h}}
end tell`,
		);
	},
);

export const screenshot = Effect.fn("flatmaxx.macos.screenshot")(function* (
	outPath: string,
	region?: Rect,
) {
	const args = ["-x"];
	if (region !== undefined) {
		args.push("-R", `${region.x},${region.y},${region.w},${region.h}`);
	}
	args.push(outPath);
	const proc = yield* ChildProcess.make("screencapture", args);
	const exitCode = yield* proc.exitCode;
	if (exitCode !== 0) {
		return yield* Effect.fail(
			new ScreenshotError({
				message: `screencapture exited ${exitCode} → ${outPath}`,
			}),
		);
	}
	return outPath;
});
