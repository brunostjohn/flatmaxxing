import { MakeraCamError } from "@/errors";
import {
  axFind,
  ensureFrontmost,
  mouseMove,
  pressKeyCode,
  pressReturn,
  rightClickAt,
} from "@/macos";
import type { AxElementInfo } from "@flatmaxxing/accessibility";
import { Array, Duration, Effect, Schedule } from "effect";
import { KEY_ESCAPE, KEY_UP, SETTLE } from "../constants";
import { MAKERACAM_PROCESS } from "../process";

export const contextMenuOpen = Effect.fnUntraced(function* (pid: number) {
  const menus = yield* axFind(pid, { role: "AXMenu" });
  return menus.some((menu) => menu.w > 0 && menu.h > 0);
});

const STILL_OPEN = new MakeraCamError({
  message: "flatmaxx.makeracam.contextMenu.stillOpen",
});

export const dismissContextMenus = Effect.fnUntraced(function* (pid: number) {
  const escapeOnce = Effect.gen(function* () {
    if (!(yield* contextMenuOpen(pid))) return;
    yield* pressKeyCode(KEY_ESCAPE);
    yield* Effect.sleep(Duration.millis(150));
    return yield* Effect.fail(STILL_OPEN);
  });

  yield* escapeOnce.pipe(Effect.retry(Schedule.recurs(5)), Effect.ignore);
});

const waitForMenuOpen = (pid: number) =>
  Effect.gen(function* () {
    if (yield* contextMenuOpen(pid)) return;
    yield* Effect.sleep(Duration.millis(100));
    return yield* Effect.fail(STILL_OPEN);
  }).pipe(Effect.retry(Schedule.recurs(25)), Effect.isSuccess);

const waitForMenuClosed = (pid: number) =>
  Effect.gen(function* () {
    if (!(yield* contextMenuOpen(pid))) return;
    yield* Effect.sleep(Duration.millis(120));
    return yield* Effect.fail(STILL_OPEN);
  }).pipe(Effect.retry(Schedule.recurs(24)), Effect.ignore);

export const invokeRowMenuFromBottom = Effect.fn(
  "flatmaxx.makeracam.invokeRowMenuFromBottom",
)(function* (pid: number, row: AxElementInfo, fromBottom: number) {
  yield* ensureFrontmost(MAKERACAM_PROCESS);
  yield* dismissContextMenus(pid);

  const { cx: x, cy: y } = row;
  const tryOpen = Effect.gen(function* () {
    yield* mouseMove({ x: x - 40, y });
    yield* Effect.sleep(Duration.millis(50));
    yield* mouseMove({ x, y });
    yield* Effect.sleep(Duration.millis(100));
    yield* rightClickAt({ x, y });
    return yield* waitForMenuOpen(pid);
  });

  const opened = (yield* tryOpen) || (yield* tryOpen);
  if (!opened) {
    return yield* Effect.fail(
      new MakeraCamError({
        message: "context menu did not open (right-click produced no AXMenu)",
      }),
    );
  }

  const upSteps = fromBottom > 0 ? Array.range(1, fromBottom) : [];
  yield* Effect.forEach(upSteps, () =>
    Effect.gen(function* () {
      yield* pressKeyCode(KEY_UP);
      yield* Effect.sleep(Duration.millis(50));
    }),
  );
  yield* pressReturn();

  yield* waitForMenuClosed(pid);
  yield* Effect.sleep(SETTLE);
});
