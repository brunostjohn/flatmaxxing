import { renderWithOutput } from "@/inkHelpers";
import { ConfirmInput } from "@inkjs/ui";
import { Effect } from "effect";
import { Box, Text } from "ink";

export const confirmCloseExistingMakeraCam = Effect.fn(
  "flatmaxx.makeracam.confirmCloseExisting",
)(function* (processIds: readonly number[]) {
  return yield* renderWithOutput<boolean>((send) => (
    <Box flexDirection="column">
      <Text color="yellow">
        MakeraCAM is already open ({processIds.join(", ")}). Close it, then
        continue?
      </Text>
      <ConfirmInput
        defaultChoice="cancel"
        onConfirm={() => send(true)}
        onCancel={() => send(false)}
      />
    </Box>
  ));
});
