import type { IDxf } from "dxf-parser";
import { Effect } from "effect";
import type { DxfWorkerRequest, DxfWorkerResponse } from "./dxfWorker";

const workerUrl = new URL("./dxfWorker.ts", import.meta.url).href;

/**
 * Runs one DXF computation in a fresh Bun worker, wrapped as an Effect that
 * resolves with the result. The worker is acquired and terminated within the
 * Effect (on success, failure, or interruption), so structured parallelism via
 * `Effect.all({ concurrency })` spins up one worker per task and cleans each up.
 */
const runInWorker = <A>(request: DxfWorkerRequest): Effect.Effect<A, Error> =>
  Effect.acquireUseRelease(
    Effect.sync(() => new Worker(workerUrl, { type: "module" })),
    (worker) =>
      Effect.callback<A, Error>((resume) => {
        worker.onmessage = (event: MessageEvent<DxfWorkerResponse>) => {
          const data = event.data;
          resume(
            data.ok
              ? Effect.succeed(data.result as A)
              : Effect.fail(new Error(data.error)),
          );
        };
        worker.onerror = (event: ErrorEvent) => {
          resume(Effect.fail(new Error(event.message ?? "DXF worker error")));
        };
        worker.postMessage(request);
      }),
    (worker) => Effect.sync(() => worker.terminate()),
  );

/** Measure a parsed DXF's bounding box, off the main thread. */
export const dxfBounds = (
  dxf: IDxf,
): Effect.Effect<{ width: number; height: number }, Error> =>
  runInWorker({ op: "bounds", dxf });

/** Whether a parsed DXF contains any plottable geometry, off the main thread. */
export const dxfHasPlottableGeometry = (
  dxf: IDxf,
): Effect.Effect<boolean, Error> => runInWorker({ op: "plottable", dxf });
