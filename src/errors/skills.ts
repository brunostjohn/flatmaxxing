import { Data } from "effect";

export class SkillInstallError extends Data.TaggedError("SkillInstallError")<{
  message: string;
  cause?: unknown;
}> {}
