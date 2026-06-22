import { nextStep, renderWaiting } from "@/inkHelpers";
import { Effect } from "effect";
import { orchestrateMakeracamStep } from "./orchestrateMakeracamStep";
import type { MakeracamStepOptions } from "./types";

export const runPlatedHoles = Effect.fn("flatmaxx.makeracam.runPlatedHoles")(
	function* (
		pcbName: string,
		edgeCutGerberPath: string,
		contourMillDiameter: number,
		options: MakeracamStepOptions,
	) {
		if (!options.enabled) {
			const [success] = yield* renderWaiting({
				loading: "MakeraCAM plated holes...",
			});
			yield* success("MakeraCAM plated holes disabled — skipping.");
			return;
		}

		const step = nextStep();
		const tag = (message: string): string => `Step ${step}: ${message}`;
		const [success, error, stop] = yield* renderWaiting({
			loading: tag("MakeraCAM: plated holes + PTH + edge cut..."),
		});

		const result = yield* orchestrateMakeracamStep(
			options,
			pcbName,
			edgeCutGerberPath,
			contourMillDiameter,
		).pipe(
			Effect.tapError((cause) =>
				error(
					tag(
						`MakeraCAM plated step failed: ${
							cause instanceof Error ? cause.message : String(cause)
						}`,
					),
				).pipe(Effect.catch(() => stop)),
			),
		);

		yield* success(
			tag(
				`Plated step complete — ${result.pathCount} path(s) → ${result.gcodePath}`,
			),
		);
	},
);
