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
  type MousePos,
  type WaitOptions,
} from "@flatmaxxing/accessibility";
import { Effect } from "effect";
import { AXError, MouseError } from "./errors";

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

export const axFind = Effect.fn("flatmaxx.macos.axFind")(function* (
  pid: number,
  query: AxQuery,
) {
  return yield* Effect.sync(() => axFindNative(pid, query)).pipe(
    Effect.andThen(Effect.fromNullishOr),
  );
});

export const showMenu = Effect.fn("flatmaxx.macos.axShowMenu")(function* (
  pid: number,
  query: AxQuery,
) {
  return yield* Effect.try({
    try: () => showMenuNative(pid, query),
    catch: (error) =>
      new AXError({
        message: "showMenu failed",
        cause: error,
      }),
  });
});

export const pickElement = Effect.fn("flatmaxx.macos.pickElement")(function* (
  pid: number,
  query: AxQuery,
) {
  return yield* Effect.try({
    try: () => pickElementNative(pid, query),
    catch: (error) =>
      new AXError({
        message: "pickElement failed",
        cause: error,
      }),
  });
});

export const scrollToVisible = Effect.fn("flatmaxx.macos.scrollToVisible")(
  function* (pid: number, query: AxQuery) {
    return yield* Effect.try({
      try: () => scrollToVisibleNative(pid, query),
      catch: (error) =>
        new AXError({
          message: "scrollToVisible failed",
          cause: error,
        }),
    });
  },
);

export const findElement = Effect.fn("flatmaxx.macos.findElement")(function* (
  pid: number,
  query: AxQuery,
) {
  return yield* Effect.try({
    try: () => findElementNative(pid, query),
    catch: (error) =>
      new AXError({
        message: "findElement failed",
        cause: error,
      }),
  });
});

export const elementExists = Effect.fn("flatmaxx.macos.elementExists")(
  function* (pid: number, query: AxQuery) {
    return yield* Effect.sync(() => elementExistsNative(pid, query));
  },
);

export const clickElement = Effect.fn("flatmaxx.macos.clickElement")(function* (
  pid: number,
  query: AxQuery,
) {
  return yield* Effect.tryPromise({
    try: () => clickElementNative(pid, query),
    catch: (error) =>
      new MouseError({
        message: "clickElement failed",
        cause: error,
      }),
  });
});

export const doubleClickElement = Effect.fn(
  "flatmaxx.macos.doubleClickElement",
)(function* (pid: number, query: AxQuery) {
  return yield* Effect.tryPromise({
    try: () => doubleClickElementNative(pid, query),
    catch: (error) =>
      new MouseError({
        message: "doubleClickElement failed",
        cause: error,
      }),
  });
});

export const rightClickElement = Effect.fn("flatmaxx.macos.rightClickElement")(
  function* (pid: number, query: AxQuery) {
    return yield* Effect.tryPromise({
      try: () => rightClickElementNative(pid, query),
      catch: (error) =>
        new MouseError({
          message: "rightClickElement failed",
          cause: error,
        }),
    });
  },
);

export const axPress = Effect.fn("flatmaxx.macos.axPress")(function* (
  pid: number,
  query: AxQuery,
) {
  return yield* Effect.try({
    try: () => axPressNative(pid, query),
    catch: (error) =>
      new AXError({
        message: "axPress failed",
        cause: error,
      }),
  });
});

export const axPerformAction = Effect.fn("flatmaxx.macos.axPerformAction")(
  function* (pid: number, query: AxQuery, action: string) {
    return yield* Effect.try({
      try: () => axPerformActionNative(pid, query, action),
      catch: (error) =>
        new AXError({
          message: "axPerformAction failed",
          cause: error,
        }),
    });
  },
);

export const axActions = Effect.fn("flatmaxx.macos.axActions")(function* (
  pid: number,
  query: AxQuery,
) {
  return yield* Effect.try({
    try: () => axActionsNative(pid, query),
    catch: (error) =>
      new AXError({
        message: "axActions failed",
        cause: error,
      }),
  });
});

export const axSetValue = Effect.fn("flatmaxx.macos.axSetValue")(function* (
  pid: number,
  query: AxQuery,
  value: string,
) {
  return yield* Effect.try({
    try: () => axSetValueNative(pid, query, value),
    catch: (error) =>
      new AXError({
        message: "axSetValue failed",
        cause: error,
      }),
  });
});

export const mousePos = Effect.fn("flatmaxx.macos.mousePos")(function* () {
  return yield* Effect.try({
    try: () => mousePosNative(),
    catch: (error) =>
      new MouseError({
        message: "mousePos failed",
        cause: error,
      }),
  });
});

export const mouseMove = Effect.fn("flatmaxx.macos.mouseMove")(function* (
  pos: MousePos,
) {
  return yield* Effect.try({
    try: () => mouseMoveNative(pos),
    catch: (error) =>
      new MouseError({
        message: "mouseMove failed",
        cause: error,
      }),
  });
});

export const mouseClick = Effect.fn("flatmaxx.macos.mouseClick")(function* (
  pos: MousePos,
) {
  return yield* Effect.tryPromise({
    try: () => mouseClickNative(pos),
    catch: (error) =>
      new MouseError({
        message: "mouseClick failed",
        cause: error,
      }),
  });
});

export const mouseRightClick = Effect.fn("flatmaxx.macos.mouseRightClick")(
  function* (pos: MousePos) {
    return yield* Effect.tryPromise({
      try: () => mouseRightClickNative(pos),
      catch: (error) =>
        new MouseError({
          message: "mouseRightClick failed",
          cause: error,
        }),
    });
  },
);

export const mouseDoubleClick = Effect.fn("flatmaxx.macos.mouseDoubleClick")(
  function* (pos: MousePos) {
    return yield* Effect.tryPromise({
      try: () => mouseDoubleClickNative(pos),
      catch: (error) =>
        new MouseError({
          message: "mouseDoubleClick failed",
          cause: error,
        }),
    });
  },
);

export const mouseScroll = Effect.fn("flatmaxx.macos.mouseScroll")(function* (
  pos: MousePos,
  lines: number,
) {
  return yield* Effect.tryPromise({
    try: () => mouseScrollNative(pos, lines),
    catch: (error) =>
      new MouseError({
        message: "mouseScroll failed",
        cause: error,
      }),
  });
});

export const waitForElement = Effect.fn("flatmaxx.macos.waitForElement")(
  function* (pid: number, query: AxQuery, opts?: WaitOptions) {
    return yield* Effect.tryPromise({
      try: () => waitForElementNative(pid, query, opts),
      catch: (error) =>
        new AXError({
          message: "waitForElement failed",
          cause: error,
        }),
    });
  },
);

export const waitForGone = Effect.fn("flatmaxx.macos.waitForGone")(function* (
  pid: number,
  query: AxQuery,
  opts?: WaitOptions,
) {
  return yield* Effect.tryPromise({
    try: () => waitForGoneNative(pid, query, opts),
    catch: (error) =>
      new AXError({
        message: "waitForGone failed",
        cause: error,
      }),
  });
});
