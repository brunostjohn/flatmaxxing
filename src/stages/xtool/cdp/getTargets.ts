import CDP from "chrome-remote-interface";
import { Effect } from "effect";
import { xToolStudioTargetListUrl } from "../process";

export const getTargets = Effect.tryPromise({
	try: async () => {
		const response = await fetch(xToolStudioTargetListUrl, {
			signal: AbortSignal.timeout(1000),
		});

		if (!response.ok) {
			throw new Error(
				`CDP target list returned HTTP ${response.status} ${response.statusText}`,
			);
		}

		return (await response.json()) as CDP.Target[];
	},
	catch: (cause) =>
		cause instanceof Error
			? cause
			: new Error(`Unable to list CDP targets: ${String(cause)}`),
});
