import { Data } from "effect";

export class DxfError extends Data.TaggedError("DxfError")<{
  message: string;
  cause?: unknown;
}> {}

export class DxfWorkerError extends Data.TaggedError("DxfWorkerError")<{
  message: string;
  cause?: unknown;
}> {}
