import { resolveExecutableDependency } from "@/preflight";
import { Effect } from "effect";
import { NPX_COMMAND } from "./constants";

export const isNpxAvailable = Effect.fn("flatmaxx.skills.isNpxAvailable")(
  function* () {
    const resolution = yield* resolveExecutableDependency(NPX_COMMAND);
    return resolution.status === "found";
  },
);
