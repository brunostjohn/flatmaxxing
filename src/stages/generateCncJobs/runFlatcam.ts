import { CncError } from "@/errors";
import {
  Array,
  Effect,
  Fiber,
  FileSystem,
  Match,
  Option,
  Ref,
  Schedule,
} from "effect";
import { ChildProcess } from "effect/unstable/process";
import { FLATCAM_DEFAULT_TIMEOUT_SECONDS } from "./constants";
import type { RunFlatcamOptions } from "./types";

export type { RunFlatcamOptions } from "./types";

const shQuote = (value: string): string => `'${value.replace(/'/g, "'\\''")}'`;

const PROGRESS_LINE =
  /Generating GCode for tool|clearing with tool diameter|geometry processing for tool|Total number of polygons|Buffering|Union\(buffer\)|Joining \d+ polygons|TclCommand(OpenGerber|Mirror|Isolate|CopperClear|SplitGeometry|Cncjob|WriteGCode)/i;

const clean = (line: string): string =>
  line
    .replace(/^\[[A-Za-z_]+\]\[[^\]]*\]\s*/, "")
    .replace(/^camlib\.\S+\s*->?\s*/, "")
    .replace(/^TCL command '(\w+)' executed\.?$/, "$1")
    .slice(0, 90);

export const summarizeFlatcamLog = (log: string): string | undefined => {
  const lines = Array.filter(
    log.split(/\r?\n/).map((l) => l.trim()),
    (l) => l.length > 0,
  );
  return Option.getOrUndefined(
    Option.map(
      Option.orElse(
        Array.findLast(lines, (line) => PROGRESS_LINE.test(line)),
        () => Array.last(lines),
      ),
      clean,
    ),
  );
};

const buildWrapper = (
  q: { flatcam: string; shell: string; log: string; done: string },
  timeout: number,
): string =>
  [
    `${q.flatcam} --shellfile=${q.shell} --headless=1 > ${q.log} 2>&1 &`,
    "FPID=$!",
    "i=0",
    `while [ $i -lt ${timeout} ]; do`,
    `  if [ -f ${q.done} ]; then break; fi`,
    "  if ! kill -0 $FPID 2>/dev/null; then break; fi",
    "  sleep 1",
    "  i=$((i+1))",
    "done",
    "pkill -9 -P $FPID 2>/dev/null",
    "kill -9 $FPID 2>/dev/null",
    `if [ -f ${q.done} ]; then exit 0; else exit 1; fi`,
  ].join("\n");

export const runFlatcam = Effect.fn("flatmaxx.generateCncJobs.runFlatcam")(
  function* (options: RunFlatcamOptions) {
    const fs = yield* FileSystem.FileSystem;
    yield* fs.remove(options.doneFile).pipe(Effect.ignore);

    const timeout = options.timeoutSeconds ?? FLATCAM_DEFAULT_TIMEOUT_SECONDS;
    const wrapper = buildWrapper(
      {
        flatcam: shQuote(options.flatcam),
        shell: shQuote(options.shellFile),
        log: shQuote(options.logFile),
        done: shQuote(options.doneFile),
      },
      timeout,
    );

    const handle = yield* ChildProcess.make("sh", ["-c", wrapper], {
      env: { QT_QPA_PLATFORM: "offscreen" },
      extendEnv: true,
      stdout: "ignore",
      stderr: "ignore",
    });

    const onProgress = options.onProgress;
    const poller = yield* Match.value(onProgress).pipe(
      Match.when(Match.defined, (report) =>
        Effect.map(Ref.make(""), (last) =>
          pollLog(fs, options.logFile, report, last),
        ).pipe(Effect.flatMap(Effect.forkChild)),
      ),
      Match.orElse(() => Effect.succeed(undefined)),
    );

    const code = yield* handle.exitCode;
    if (poller) yield* Fiber.interrupt(poller);

    yield* Match.value(code).pipe(
      Match.when(0, () => Effect.void),
      Match.orElse(() => failWithLogTail(fs, options.logFile, timeout)),
    );
  },
  Effect.scoped,
);

const pollLog = (
  fs: FileSystem.FileSystem,
  logFile: string,
  report: (line: string) => Effect.Effect<void>,
  last: Ref.Ref<string>,
) =>
  Effect.gen(function* () {
    yield* Effect.sleep("1 second");
    const log = yield* fs
      .readFileString(logFile)
      .pipe(Effect.orElseSucceed(() => ""));
    const line = summarizeFlatcamLog(log);
    const previous = yield* Ref.get(last);
    yield* Match.value(line && line !== previous ? line : undefined).pipe(
      Match.when(Match.defined, (next) =>
        Ref.set(last, next).pipe(Effect.andThen(report(next))),
      ),
      Match.orElse(() => Effect.void),
    );
  }).pipe(Effect.repeat(Schedule.forever));

const failWithLogTail = (
  fs: FileSystem.FileSystem,
  logFile: string,
  timeout: number,
) =>
  Effect.gen(function* () {
    const log = yield* fs
      .readFileString(logFile)
      .pipe(Effect.orElseSucceed(() => "(no log captured)"));
    const tail = log.split(/\r?\n/).slice(-40).join("\n");
    return yield* Effect.fail(
      new CncError({
        message: `FlatCAM did not finish (sentinel not written within ${timeout}s).\n${tail}`,
      }),
    );
  });
