import CDP from "chrome-remote-interface";
import { Effect } from "effect";
import { xToolStudioCdpHost, xToolStudioCdpPort } from "../process";

export const getXToolStudioShell = Effect.fn("flatmaxx.xtool.getShell")(
	function* (targets: CDP.Target[]) {
		const target = targets.find(
			(t) => t.type === "page" && t.url === "atomm://renderer/shell",
		);

		if (!target) {
			return yield* Effect.fail(new Error("No xTool Studio shell found."));
		}

		return yield* Effect.promise(() =>
			CDP({
				host: xToolStudioCdpHost,
				port: xToolStudioCdpPort,
				target: target.id,
			}),
		);
	},
);
