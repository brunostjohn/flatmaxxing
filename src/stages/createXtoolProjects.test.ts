import { expect, test } from "bun:test";
import { getSolderMaskPastePosition } from "./createXtoolProjects";

const boardBounds = { width: 42.5, height: 25 };

test("places the first front solder mask at the origin", () => {
  expect(getSolderMaskPastePosition(boardBounds)).toEqual({ x: 0, y: 0 });
});

test("places the second front solder mask to the right of the first", () => {
  expect(getSolderMaskPastePosition(boardBounds, { right: 6 })).toEqual({
    x: 48.5,
    y: 0,
  });
});

test("places the first back solder mask below the front row", () => {
  expect(getSolderMaskPastePosition(boardBounds, { bottom: 10 })).toEqual({
    x: 0,
    y: 35,
  });
});

test("places the second back solder mask below and to the right", () => {
  expect(
    getSolderMaskPastePosition(boardBounds, { right: 6, bottom: 10 }),
  ).toEqual({ x: 48.5, y: 35 });
});

test("uses zero bottom offset as no vertical gap between mask rows", () => {
  expect(getSolderMaskPastePosition(boardBounds, { bottom: 0 })).toEqual({
    x: 0,
    y: 25,
  });
});
