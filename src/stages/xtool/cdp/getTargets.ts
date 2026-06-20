import CDP from "chrome-remote-interface";
import { Effect } from "effect";

export const getTargets = Effect.promise(() => CDP.List({ port: 9333 }));
