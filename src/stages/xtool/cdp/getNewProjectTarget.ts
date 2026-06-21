import CDP from "chrome-remote-interface";
import { Effect } from "effect";
import { xToolStudioCdpHost, xToolStudioCdpPort } from "../process";
import type { XToolStudioRuntimeOptions } from "../process";
import { getTargets } from "./getTargets";

export const getNewProjectTarget = Effect.fn("flatmaxx.xtool.getEditor")(
	function* (options?: Partial<XToolStudioRuntimeOptions>) {
		const targets = yield* getTargets(options);

		const target = targets.find(
			(t) =>
				t.type === "page" &&
				t.url === "atomm://renderer/editor/" &&
				t.title.includes("Untitled"),
		);

		if (!target) {
			return yield* Effect.fail(new Error("No new project target found."));
		}

		return yield* Effect.promise(() =>
			CDP({
				host: options?.cdpHost ?? xToolStudioCdpHost,
				port: options?.cdpPort ?? xToolStudioCdpPort,
				target: target.id,
			}),
		);
	},
);
