import { Effect } from "effect";

const processExists = (processId: number) => {
	try {
		globalThis.process.kill(processId, 0);
		return true;
	} catch (error) {
		return error instanceof Error && "code" in error && error.code === "EPERM";
	}
};

export const getRunningProcessIds = Effect.fn(
	"flatmaxx.xtool.process.getRunningProcessIds",
)(function* (processIds: readonly number[]) {
	return yield* Effect.sync(() =>
		processIds.filter((processId) => processExists(processId)),
	);
});
