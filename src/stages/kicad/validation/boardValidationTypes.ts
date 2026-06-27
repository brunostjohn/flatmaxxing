import type { PlatingBathValidationOptions } from "@/config";
import type { BoardValidationError } from "@/errors";
import type { Effect } from "effect";
import type { KicadPcb } from "kicadts";

export interface BoardValidationContext {
  readonly projectFilePath: string;
  readonly pcb: KicadPcb;
  readonly source: string;
  readonly platingBath?: PlatingBathValidationOptions | undefined;
}

export interface BoardFix {
  readonly id: string;
  readonly message: string;
  readonly apply: (pcb: KicadPcb) => void;
}

export type BoardValidator = (
  context: BoardValidationContext,
) => Effect.Effect<ReadonlyArray<BoardFix> | null, BoardValidationError>;
