import type { BoardValidationOptions } from "@/config";
import { BoardValidationError, KicadError } from "@/errors";
import {
  createTasklist,
  markTaskBranch,
  renderOnce,
  renderWithOutput,
} from "@/inkHelpers";
import {
  applyBoardFixes,
  validateBoard,
} from "@/stages/kicad/validation/boardValidation";
import type { BoardFix } from "@/stages/kicad/validation/boardValidationTypes";
import { validateBoardTasks } from "@/stages/kicad/validation/tasks";
import { validateBoardTaskPaths } from "@/stages/kicad/validation/taskPaths";
import { Alert, ConfirmInput, StatusMessage } from "@inkjs/ui";
import { Effect, FileSystem, Match } from "effect";
import { Box, Text } from "ink";
import { parseKicadPcb, type KicadPcb } from "kicadts";

const confirmFix = (fixes: readonly BoardFix[]) =>
  renderWithOutput<boolean>((send) => (
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

const writeFixedBoard = Effect.fn(
  "flatmaxx.validateKicadBoard.writeFixedBoard",
)(function* (
  projectFilePath: string,
  pcb: KicadPcb,
  fixes: readonly BoardFix[],
) {
  const fs = yield* FileSystem.FileSystem;

  pcb.generator = `"pcbnew"`;
  pcb.generatorVersion = `"9.0"`;

  yield* fs.writeFileString(projectFilePath, `${pcb.getStringIndented()}\n`);
  yield* renderOnce(
    <Alert variant="success" title="Board updated">
      {fixes.map((fix) => fix.message).join("\n")}
    </Alert>,
  );
});

export const validateKicadBoard = Effect.fn("flatmaxx.validateKicadBoard")(
  function* (
    projectFilePath: string,
    options: BoardValidationOptions = { autoFix: false },
  ) {
    const fs = yield* FileSystem.FileSystem;
    const tasks = yield* createTasklist(validateBoardTasks);

    const { source, pcb } = yield* tasks.runTask({
      path: validateBoardTaskPaths.parse,
      loading: { status: "Reading KiCAD PCB file..." },
      success: { label: "KiCAD PCB file parsed." },
      error: { label: "Failed to parse KiCAD PCB file." },
      effect: Effect.gen(function* () {
        const source = yield* fs.readFileString(projectFilePath);
        const pcb = yield* Effect.try({
          try: () => parseKicadPcb(source),
          catch: (cause) =>
            new BoardValidationError({
              message: `Unable to parse KiCad PCB file "${projectFilePath}".`,
              cause,
            }),
        });
        return { source, pcb };
      }),
    });

    const fixes = yield* tasks.runTask({
      path: validateBoardTaskPaths.validate,
      effect: validateBoard({
        projectFilePath,
        pcb,
        source,
        platingBath: options.platingBath,
      }),
      loading: { status: "Running board validators..." },
      success: { label: "Board validators complete." },
      error: { label: "Board validation failed." },
    });

    if (fixes === null) {
      yield* tasks.patchTask(validateBoardTaskPaths.validate, {
        state: "success",
        label: "No validation errors found.",
      });
      return yield* markTaskBranch(
        tasks,
        validateBoardTasks,
        validateBoardTaskPaths.applyFixes,
        {
          state: "success",
          label: "No board fixes needed.",
          status: "Board already valid.",
        },
      );
    }

    yield* tasks.patchTask(validateBoardTaskPaths.validate, {
      state: "warning",
      label: "The board has validation errors.",
    });

    const shouldFix = options.autoFix ? true : yield* confirmFix(fixes);

    return yield* Match.value(shouldFix).pipe(
      Match.when(false, () =>
        Effect.gen(function* () {
          yield* tasks.patchTask(validateBoardTaskPaths.applyFixes, {
            state: "error",
            label: "User did not want to fix the board.",
          });
          return yield* Effect.fail(
            new KicadError({
              message: "User did not want to fix the board.",
            }),
          );
        }),
      ),
      Match.orElse(() =>
        tasks.runTask({
          path: validateBoardTaskPaths.applyFixes,
          loading: { status: "Applying board fixes..." },
          success: { label: "Board fixes applied." },
          error: { label: "Failed to apply board fixes." },
          effect: Effect.gen(function* () {
            const changed = yield* applyBoardFixes(pcb, fixes);
            if (!changed) {
              return yield* Effect.fail(
                new KicadError({ message: "No board changes were made." }),
              );
            }
            yield* writeFixedBoard(projectFilePath, pcb, fixes);
          }),
        }),
      ),
    );
  },
  Effect.scoped,
);
