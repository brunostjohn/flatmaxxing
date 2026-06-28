import { Effect } from "effect";
import { cellAspectQueryTimeout } from "./constants";

const cellSizePattern = /\x1b\[6;(\d+);(\d+)t/;

const readCellAspect = Effect.callback<number>((resume, signal) => {
  const { stdin, stdout } = process;
  let buffer = "";
  let done = false;

  const cleanup = () => {
    if (done) {
      return;
    }
    done = true;
    stdin.removeListener("data", onData);
    stdin.setRawMode(false);
    stdin.pause();
  };

  const onData = (chunk: Buffer) => {
    buffer += chunk.toString("latin1");
    const match = buffer.match(cellSizePattern);
    if (!match) {
      return;
    }
    cleanup();
    const cellHeight = Number(match[1]);
    const cellWidth = Number(match[2]);
    resume(
      Effect.succeed(
        cellHeight > 0 && cellWidth > 0 ? cellWidth / cellHeight : 0,
      ),
    );
  };

  signal.addEventListener("abort", cleanup);
  stdin.on("data", onData);
  stdin.setRawMode(true);
  stdin.resume();
  stdout.write("\x1b[16t");
});

export const queryCellAspect = (fallback: number) => {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return Effect.succeed(fallback);
  }

  return readCellAspect.pipe(
    Effect.timeout(cellAspectQueryTimeout),
    Effect.map((aspect) => (aspect > 0 ? aspect : fallback)),
    Effect.catch(() => Effect.succeed(fallback)),
  );
};
