import type { XToolLifecycleOptions } from "@/config";
import type { Client } from "chrome-remote-interface";
import { Effect } from "effect";
import { clickF1Ultra } from "../scripts";
import type { DeviceSelectionTaskPaths, XToolTasks } from "./types";
import { selectXtoolDevice } from "./selectXtoolDevice";

export const configureDeviceForSolderPasteStencil = Effect.fn(
	"flatmaxx.xtool.configureDeviceForSolderPasteStencil",
)(function* (
	newProjectTarget: Client,
	tasks: XToolTasks,
	paths: DeviceSelectionTaskPaths,
	options?: XToolLifecycleOptions,
) {
	yield* selectXtoolDevice(
		newProjectTarget,
		tasks,
		paths,
		"F1 Ultra",
		clickF1Ultra,
		options?.window,
	);
});
