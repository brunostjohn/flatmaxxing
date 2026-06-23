import {
  axActions as axActionsNative,
  axFind as axFindNative,
  axPerformAction as axPerformActionNative,
  axPress as axPressNative,
  axRequestTrusted as axRequestTrustedNative,
  axSetValue as axSetValueNative,
  axTrusted as axTrustedNative,
  clickElement as clickElementNative,
  doubleClickElement as doubleClickElementNative,
  elementExists as elementExistsNative,
  findElement as findElementNative,
  mouseClick as mouseClickNative,
  mouseDoubleClick as mouseDoubleClickNative,
  mouseMove as mouseMoveNative,
  mousePos as mousePosNative,
  mouseRightClick as mouseRightClickNative,
  mouseScroll as mouseScrollNative,
  pickElement as pickElementNative,
  rightClickElement as rightClickElementNative,
  screenCaptureGranted as screenCaptureGrantedNative,
  scrollToVisible as scrollToVisibleNative,
  showMenu as showMenuNative,
  waitForElement as waitForElementNative,
  waitForGone as waitForGoneNative,
  type AxQuery,
} from "@flatmaxxing/accessibility";
import { Effect } from "effect";
import { AXError, MouseError } from "./errors";

const wrapAx = <A extends unknown[], R>(name: string, fn: (...args: A) => R) =>
  Effect.fn(name)(function* (...args: A) {
    return yield* Effect.try({
      try: () => fn(...args),
      catch: (cause) => new AXError({ message: `${name} failed`, cause }),
    });
  });

const wrapAxAsync = <A extends unknown[], R>(
  name: string,
  fn: (...args: A) => Promise<R>,
) =>
  Effect.fn(name)(function* (...args: A) {
    return yield* Effect.tryPromise({
      try: () => fn(...args),
      catch: (cause) => new AXError({ message: `${name} failed`, cause }),
    });
  });

const wrapMouse = <A extends unknown[], R>(
  name: string,
  fn: (...args: A) => R,
) =>
  Effect.fn(name)(function* (...args: A) {
    return yield* Effect.try({
      try: () => fn(...args),
      catch: (cause) => new MouseError({ message: `${name} failed`, cause }),
    });
  });

const wrapMouseAsync = <A extends unknown[], R>(
  name: string,
  fn: (...args: A) => Promise<R>,
) =>
  Effect.fn(name)(function* (...args: A) {
    return yield* Effect.tryPromise({
      try: () => fn(...args),
      catch: (cause) => new MouseError({ message: `${name} failed`, cause }),
    });
  });

export const axTrusted = Effect.fn("flatmaxx.macos.axTrusted")(function* () {
  return yield* Effect.sync(() => axTrustedNative());
});

export const axRequestTrusted = Effect.fn("flatmaxx.macos.axRequestTrusted")(
  function* () {
    return yield* Effect.sync(() => axRequestTrustedNative());
  },
);

export const screenCaptureGranted = Effect.fn(
  "flatmaxx.macos.screenCaptureGranted",
)(function* () {
  return yield* Effect.sync(() => screenCaptureGrantedNative());
});

export const elementExists = Effect.fn("flatmaxx.macos.elementExists")(
  function* (pid: number, query: AxQuery) {
    return yield* Effect.sync(() => elementExistsNative(pid, query));
  },
);

export const axFind = Effect.fn("flatmaxx.macos.axFind")(function* (
  pid: number,
  query: AxQuery,
) {
  return (yield* Effect.sync(() => axFindNative(pid, query))) ?? [];
});

export const showMenu = wrapAx("flatmaxx.macos.axShowMenu", showMenuNative);
export const pickElement = wrapAx(
  "flatmaxx.macos.pickElement",
  pickElementNative,
);
export const scrollToVisible = wrapAx(
  "flatmaxx.macos.scrollToVisible",
  scrollToVisibleNative,
);
export const findElement = wrapAx(
  "flatmaxx.macos.findElement",
  findElementNative,
);
export const axPress = wrapAx("flatmaxx.macos.axPress", axPressNative);
export const axPerformAction = wrapAx(
  "flatmaxx.macos.axPerformAction",
  axPerformActionNative,
);
export const axActions = wrapAx("flatmaxx.macos.axActions", axActionsNative);
export const axSetValue = wrapAx("flatmaxx.macos.axSetValue", axSetValueNative);

export const waitForElement = wrapAxAsync(
  "flatmaxx.macos.waitForElement",
  waitForElementNative,
);
export const waitForGone = wrapAxAsync(
  "flatmaxx.macos.waitForGone",
  waitForGoneNative,
);

export const mousePos = wrapMouse("flatmaxx.macos.mousePos", mousePosNative);
export const mouseMove = wrapMouse("flatmaxx.macos.mouseMove", mouseMoveNative);

export const clickElement = wrapMouseAsync(
  "flatmaxx.macos.clickElement",
  clickElementNative,
);
export const doubleClickElement = wrapMouseAsync(
  "flatmaxx.macos.doubleClickElement",
  doubleClickElementNative,
);
export const rightClickElement = wrapMouseAsync(
  "flatmaxx.macos.rightClickElement",
  rightClickElementNative,
);
export const mouseClick = wrapMouseAsync(
  "flatmaxx.macos.mouseClick",
  mouseClickNative,
);
export const mouseRightClick = wrapMouseAsync(
  "flatmaxx.macos.mouseRightClick",
  mouseRightClickNative,
);
export const mouseDoubleClick = wrapMouseAsync(
  "flatmaxx.macos.mouseDoubleClick",
  mouseDoubleClickNative,
);
export const mouseScroll = wrapMouseAsync(
  "flatmaxx.macos.mouseScroll",
  mouseScrollNative,
);
