export * from "./automation";
export * from "./permissions";
export * from "./runAppleScript";
export * from "./types";
export {
  axActions,
  axFind,
  axTrusted,
  mouseClick as clickAt,
  clickElement,
  mouseDoubleClick as doubleClickAt,
  doubleClickElement,
  elementExists,
  findElement,
  mouseMove,
  mousePos,
  mouseScroll,
  axPerformAction as performAction,
  pickElement,
  axPress as pressElement,
  mouseRightClick as rightClickAt,
  rightClickElement,
  scrollToVisible,
  axSetValue as setElementValue,
  showMenu,
  waitForElement,
  waitForGone,
} from "./nativeHelper";
