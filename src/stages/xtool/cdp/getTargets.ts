import { XToolError } from "@/errors";
import { Duration, Effect, Match, Option, Schema } from "effect";
import {
  getXToolStudioTargetListUrl,
  xToolStudioTargetListUrl,
} from "../process";
import type { XToolStudioRuntimeOptions } from "../process";
import { XToolCdpTargetsSchema } from "./schema";

const targetListTimeout = Duration.seconds(1);

const fetchTargetsUnsafe = (url: string, signal: AbortSignal) =>
  fetch(url, { signal });

const readResponseJsonUnsafe = (response: Response) => response.json();

const targetListUrl = (options?: Partial<XToolStudioRuntimeOptions>) =>
  Option.fromUndefinedOr(options).pipe(
    Option.match({
      onNone: () => xToolStudioTargetListUrl,
      onSome: getXToolStudioTargetListUrl,
    }),
  );

const fetchTargetListResponse = (url: string) =>
  Effect.tryPromise({
    try: (signal) => fetchTargetsUnsafe(url, signal),
    catch: (cause) =>
      new XToolError({ message: "Unable to list CDP targets.", cause }),
  }).pipe(Effect.timeout(targetListTimeout));

const ensureTargetListResponseOk = (response: Response) =>
  Match.value(response.ok).pipe(
    Match.when(true, () => Effect.succeed(response)),
    Match.orElse(() =>
      Effect.fail(
        new XToolError({
          message: `CDP target list returned HTTP ${response.status} ${response.statusText}`,
        }),
      ),
    ),
  );

const readTargetListJson = (response: Response) =>
  Effect.tryPromise({
    try: () => readResponseJsonUnsafe(response),
    catch: (cause) =>
      new XToolError({ message: "Unable to read CDP target JSON.", cause }),
  });

const decodeTargets = (raw: unknown) =>
  Schema.decodeUnknownEffect(XToolCdpTargetsSchema)(raw).pipe(
    Effect.mapError(
      (cause) =>
        new XToolError({
          message: "CDP target list has an invalid shape.",
          cause,
        }),
    ),
  );

export const getTargets = (options?: Partial<XToolStudioRuntimeOptions>) =>
  Effect.gen(function* () {
    const response = yield* fetchTargetListResponse(targetListUrl(options));
    const okResponse = yield* ensureTargetListResponseOk(response);
    return yield* decodeTargets(yield* readTargetListJson(okResponse));
  });

export const defaultGetTargets = getTargets();
