import CDP from "chrome-remote-interface";
import { Effect } from "effect";
import { getTargets } from "./getTargets";

export const getNewProjectTarget = Effect.fn("flatmaxx.xtool.getEditor")(
	function* () {
		const targets = yield* getTargets;

		const target = targets.find(
			(t) =>
				t.type === "page" &&
				t.url === "atomm://renderer/editor/" &&
				t.title.includes("Untitled"),
		);

		if (!target) {
			return yield* Effect.fail(new Error("No new project target found."));
		}

		return yield* Effect.promise(() => CDP({ port: 9333, target: target.id }));
	},
);
