import { renderOnce, renderWaiting, renderWithOutput } from "@/inkHelpers";
import type { BoardSelectionOptions } from "@/config";
import { Alert } from "@inkjs/ui";
import { Array, Effect } from "effect";
import { FileSystem } from "effect/FileSystem";
import { Text } from "ink";
import SelectInput from "ink-select-input";
import { resolve } from "node:path";

export const findPCBProject = Effect.fn("flatmaxx.findPCBProject")(function* (
	pathToDirectory: string,
	options: BoardSelectionOptions = {},
) {
	const fs = yield* FileSystem;

	const [success] = yield* renderWaiting({
		success: "KiCAD project found",
		loading: "Checking for KiCAD projects...",
	});

	if (!(yield* fs.exists(pathToDirectory))) {
		yield* renderOnce(
			<Alert variant="error">
				The directory "{pathToDirectory}" does not exist.
			</Alert>,
		);

		yield* Effect.die(
			new Error(`The directory "${pathToDirectory}" does not exist.`),
		);
	}

	if (options.boardFile) {
		const boardFile = options.boardFile;

		if (!boardFile.endsWith(".kicad_pcb")) {
			yield* renderOnce(
				<Alert variant="error">
					The configured board file "{boardFile}" is not a .kicad_pcb file.
				</Alert>,
			);

			yield* Effect.die(
				new Error(
					`The configured board file "${boardFile}" is not a .kicad_pcb file.`,
				),
			);
		}

		if (!(yield* fs.exists(boardFile))) {
			yield* renderOnce(
				<Alert variant="error">
					The configured board file "{boardFile}" does not exist.
				</Alert>,
			);

			yield* Effect.die(
				new Error(`The configured board file "${boardFile}" does not exist.`),
			);
		}

		yield* success("Configured project file found.");
		return boardFile;
	}

	const foundProjects = yield* fs
		.readDirectory(pathToDirectory)
		.pipe(Effect.map(Array.filter((file) => file.endsWith(".kicad_pcb"))));

	if (foundProjects.length === 0) {
		yield* renderOnce(
			<Alert variant="error">
				No KiCAD projects found in the directory "{pathToDirectory}".
			</Alert>,
		);

		yield* Effect.die(
			new Error(
				`No KiCAD projects found in the directory "${pathToDirectory}".`,
			),
		);
	}

	if (foundProjects.length === 1) {
		yield* success("Single project found.");

		return yield* Effect.sync(() =>
			resolve(pathToDirectory, foundProjects[0]!),
		);
	}

	yield* success("Multiple projects found.");

	const project = yield* renderWithOutput<string>((send) => (
		<>
			<Text color="gray">
				Found more than one project. Select which one to use:
			</Text>
			<SelectInput
				items={foundProjects.map((project) => ({
					label: project,
					value: project,
				}))}
				onSelect={({ value }) => send(value)}
			/>
		</>
	));

	return yield* Effect.sync(() => resolve(pathToDirectory, project));
});
