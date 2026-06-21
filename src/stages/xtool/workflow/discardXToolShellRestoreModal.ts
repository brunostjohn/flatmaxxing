import type { Client } from "chrome-remote-interface";
import { Effect } from "effect";
import { runScriptInXToolStudio } from "../cdp";
import { discardShellRestoreModal } from "../scripts";

export const discardXToolShellRestoreModal = Effect.fn(
	"flatmaxx.xtool.discardShellRestoreModal",
)(function* ({ Runtime }: Pick<Client, "Runtime">) {
	return yield* runScriptInXToolStudio(
		discardShellRestoreModal,
		Runtime,
		true,
	);
});
