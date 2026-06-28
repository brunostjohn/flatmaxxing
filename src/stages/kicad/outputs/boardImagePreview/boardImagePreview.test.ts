import { expect, test } from "bun:test";
import { Option } from "effect";
import { buildIterm2InlineSequence } from "./buildIterm2InlineSequence";
import { buildKittyTransmitDisplay } from "./buildKittyTransmitDisplay";
import { composePreview } from "./composePreview";
import { computePreviewSize } from "./computePreviewSize";
import { detectInlineImageProtocol } from "./detectInlineImageProtocol";
import { parsePngDimensions } from "./parsePngDimensions";
import { renderWordmark } from "./renderWordmark";

const makePng = (width: number, height: number) => {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width, false);
  view.setUint32(20, height, false);
  return bytes;
};

const wordmark = renderWordmark("flatmaxxing");

test("detects ghostty as kitty protocol", () => {
  expect(detectInlineImageProtocol({ TERM: "xterm-ghostty" })).toBe("kitty");
  expect(detectInlineImageProtocol({ TERM_PROGRAM: "ghostty" })).toBe("kitty");
  expect(detectInlineImageProtocol({ KITTY_WINDOW_ID: "1" })).toBe("kitty");
});

test("detects iterm2-family terminals", () => {
  expect(detectInlineImageProtocol({ TERM_PROGRAM: "iTerm.app" })).toBe(
    "iterm2",
  );
  expect(detectInlineImageProtocol({ TERM_PROGRAM: "WezTerm" })).toBe("iterm2");
});

test("falls back to none for plain terminals", () => {
  expect(detectInlineImageProtocol({ TERM: "xterm-256color" })).toBe("none");
  expect(detectInlineImageProtocol({})).toBe("none");
});

test("parses PNG dimensions from the IHDR header", () => {
  expect(parsePngDimensions(makePng(334, 332))).toEqual(
    Option.some({ width: 334, height: 332 }),
  );
  expect(parsePngDimensions(new Uint8Array([0, 1, 2, 3]))).toEqual(
    Option.none(),
  );
});

test("uses the measured cell aspect to size rows", () => {
  const square = computePreviewSize({
    width: 100,
    height: 100,
    terminalColumns: 200,
    cellAspect: 0.5,
  });
  expect(square).toEqual({ columns: 32, rows: 16 });

  const narrowerCells = computePreviewSize({
    width: 100,
    height: 100,
    terminalColumns: 200,
    cellAspect: 0.4,
  });
  expect(narrowerCells.rows).toBe(13);
});

test("renders the flatmaxxing wordmark as a non-empty block", () => {
  expect(wordmark.lines.length).toBeGreaterThan(0);
  expect(wordmark.width).toBeGreaterThan(0);
});

test("kitty transmit-and-display carries sizing and no cursor move", () => {
  const transmit = buildKittyTransmitDisplay({
    base64: "QUJD",
    columns: 10,
    rows: 4,
  });
  expect(transmit).toContain("a=T,f=100,t=d,c=10,r=4,C=1,q=2,m=0");
  expect(transmit).toContain(";QUJD\x1b\\");
  expect(transmit.startsWith("\x1b_G")).toBe(true);
});

test("kitty places the wordmark beside the image when it fits", () => {
  const seq = composePreview({
    protocol: "kitty",
    base64: "QUJD",
    byteLength: 3,
    size: { columns: 20, rows: 10 },
    wordmark: { lines: ["AAAA", "BBBB"], width: 4 },
    terminalColumns: 120,
  });
  expect(seq).toContain("\x1b[10A");
  expect(seq).toContain("\x1b[10B");
  expect(seq).toContain("AAAA");
  expect(seq).toContain("a=T,f=100");
});

test("kitty stacks the wordmark below when it does not fit", () => {
  const seq = composePreview({
    protocol: "kitty",
    base64: "QUJD",
    byteLength: 3,
    size: { columns: 20, rows: 10 },
    wordmark: { lines: ["AAAA"], width: 100 },
    terminalColumns: 30,
  });
  expect(seq).not.toContain("\x1b[10A");
  expect(seq.endsWith("AAAA\n")).toBe(true);
  expect(seq).toContain("\n".repeat(10));
});

test("iterm2 sequence carries inline file metadata then the wordmark", () => {
  const seq = composePreview({
    protocol: "iterm2",
    base64: "QUJD",
    byteLength: 3,
    size: { columns: 20, rows: 10 },
    wordmark: { lines: ["AAAA"], width: 4 },
    terminalColumns: 120,
  });
  expect(seq).toContain(
    "\x1b]1337;File=inline=1;size=3;width=20;preserveAspectRatio=1:QUJD\x07",
  );
  expect(seq.endsWith("AAAA\n")).toBe(true);
});
