import { Effect, Ref } from "effect";

const counter = Ref.makeUnsafe(0);

export const nextStep = () =>
  Effect.runSync(Ref.updateAndGet(counter, (n) => n + 1));

export const resetSteps = () => Effect.runSync(Ref.set(counter, 0));
