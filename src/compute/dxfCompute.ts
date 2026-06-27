import type { IDxf } from "dxf-parser";
import { Effect, Match, Schema } from "effect";
import { DxfWorkerError } from "@/errors";
import { DxfWorkerResponseSchema } from "./schema";
import type { DxfBounds } from "./schema";
import type { DxfWorkerRequest } from "./types";

const workerUrl = new URL("./dxfWorker.ts", import.meta.url).href;

const decodeResponse = Schema.decodeUnknownEffect(DxfWorkerResponseSchema);

const resolveResponse = <A>(value: unknown) =>
  decodeResponse(value).pipe(
    Effect.mapError(
      (cause) =>
        new DxfWorkerError({ message: "Invalid DXF worker response", cause }),
    ),
    Effect.flatMap((response) =>
      Match.value(response).pipe(
        Match.when({ ok: true }, (ok) => Effect.succeed(ok.result as A)),
        Match.orElse((failure) =>
          Effect.fail(new DxfWorkerError({ message: failure.error })),
        ),
      ),
    ),
  );

const runInWorker = <A>(request: DxfWorkerRequest) =>
  Effect.acquireUseRelease(
    Effect.sync(() => new Worker(workerUrl, { type: "module" })),
    (worker) =>
      Effect.callback<A, DxfWorkerError>((resume) => {
        worker.onmessage = (event: MessageEvent) =>
          resume(resolveResponse<A>(event.data));
        worker.onerror = (event: ErrorEvent) =>
          resume(
            Effect.fail(
              new DxfWorkerError({
                message: event.message ?? "DXF worker error",
              }),
            ),
          );
        worker.postMessage(request);
      }),
    (worker) => Effect.sync(() => worker.terminate()),
  );

export const dxfBounds = (
  dxf: IDxf,
): Effect.Effect<DxfBounds, DxfWorkerError> =>
  runInWorker({ op: "bounds", dxf });

export const dxfHasPlottableGeometry = (
  dxf: IDxf,
): Effect.Effect<boolean, DxfWorkerError> =>
  runInWorker({ op: "plottable", dxf });
