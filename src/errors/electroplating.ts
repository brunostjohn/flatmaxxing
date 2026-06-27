import { Data } from "effect";

export class ElectroplatingError extends Data.TaggedError(
  "ElectroplatingError",
)<{
  message: string;
  cause?: unknown;
}> {}
