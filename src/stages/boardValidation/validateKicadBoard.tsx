import { renderOnce, renderWaiting, renderWithOutput } from "@/inkHelpers";
import type { BoardValidationOptions } from "@/config";
import {
	applyBoardFixes,
	BoardValidationError,
	validateBoard,
} from "@/stages/boardValidation/boardValidation";
import { Alert, ConfirmInput, StatusMessage } from "@inkjs/ui";
import { Effect } from "effect";
import { FileSystem } from "effect/FileSystem";
import { Box, Text } from "ink";
import { parseKicadPcb } from "kicadts";

export const validateKicadBoard = Effect.fn("flatmaxx.validateKicadBoard")(
	function* (
		projectFilePath: string,
		options: BoardValidationOptions = { autoFix: false },
	) {
		const fs = yield* FileSystem;

		const [success, error, end, warning] = yield* renderWaiting({
			success: "KiCAD board validated.",
			error: "KiCAD board validation failed.",
			loading: "Validating KiCAD board...",
		});

		const source = yield* fs.readFileString(projectFilePath);
		const pcb = yield* Effect.try({
			try: () => parseKicadPcb(source),
			catch: (cause) =>
				new BoardValidationError(
					`Unable to parse KiCad PCB file "${projectFilePath}".`,
					{ cause },
				),
		}).pipe(
			Effect.tapError((error) =>
				renderOnce(<Alert variant="error">{error.message}</Alert>),
			),
		);

		const fixes = yield* validateBoard({ projectFilePath, pcb, source }).pipe(
			Effect.tapError((error) =>
				renderOnce(<Alert variant="error">{error.message}</Alert>),
			),
		);

		if (fixes === null) {
			yield* success("No validation errors found.");

			return;
		}

		yield* warning("The board has validation errors.");

		const shouldFix = options.autoFix
			? true
			: yield* renderWithOutput<boolean>((send) => (
					<>
						{fixes.map(({ message }) => (
							<StatusMessage key={message} variant="error">
								{message}
							</StatusMessage>
						))}
						<Box gap={1}>
							<Text color="magenta" bold>
								Fix the board?
							</Text>
							<ConfirmInput
								defaultChoice="confirm"
								onConfirm={() => send(true)}
								onCancel={() => send(false)}
							/>
						</Box>
					</>
				));

		if (!shouldFix) {
			yield* error("User did not want to fix the board.");

			return yield* Effect.die(
				new Error("User did not want to fix the board."),
			);
		}

		const changed = yield* applyBoardFixes(pcb, fixes);
		if (!changed) {
			yield* error("No board changes were made.");

			return yield* Effect.die(new Error("No board changes were made."));
		}

		yield* end;

		yield* fs.writeFileString(projectFilePath, `${pcb.getString()}\n`);
		yield* renderOnce(
			<Alert variant="success" title="Board updated">
				{fixes.map((fix) => fix.message).join("\n")}
			</Alert>,
		);
	},
);
