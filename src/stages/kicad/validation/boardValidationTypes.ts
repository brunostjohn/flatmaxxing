import type { PlatingBathValidationOptions } from "@/config";
import type { Effect } from "effect";
import type { KicadPcb } from "kicadts";

export class BoardValidationError extends Error {
  override readonly name = "BoardValidationError";
}

export type BoardValidationContext = {
  readonly projectFilePath: string;
  readonly pcb: KicadPcb;
  readonly source: string;
  readonly platingBath?: PlatingBathValidationOptions | undefined;
};

export type BoardFix = {
  readonly id: string;
  readonly message: string;
  readonly apply: (pcb: KicadPcb) => void;
};

export type BoardValidator = (
  context: BoardValidationContext,
) => Effect.Effect<ReadonlyArray<BoardFix> | null, BoardValidationError>;
