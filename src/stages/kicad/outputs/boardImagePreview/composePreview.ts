import { Array, Match } from "effect";
import { buildIterm2InlineSequence } from "./buildIterm2InlineSequence";
import { buildKittyTransmitDisplay } from "./buildKittyTransmitDisplay";
import { previewGap } from "./constants";
import type { InlineImageSize, Wordmark } from "./types";

interface ComposePreviewArgs {
  readonly protocol: "kitty" | "iterm2";
  readonly base64: string;
  readonly byteLength: number;
  readonly size: InlineImageSize;
  readonly wordmark: Wordmark;
  readonly terminalColumns: number;
}

const bannerBelow = (wordmark: Wordmark) =>
  wordmark.lines.length === 0 ? "" : `${wordmark.lines.join("\n")}\n`;

const kittyStacked = (
  transmit: string,
  size: InlineImageSize,
  wordmark: Wordmark,
) => `\r${transmit}${"\n".repeat(size.rows)}${bannerBelow(wordmark)}`;

const kittyBeside = (
  transmit: string,
  size: InlineImageSize,
  wordmark: Wordmark,
) => {
  const totalRows = Math.max(size.rows, wordmark.lines.length);
  const bannerTop = Math.floor((totalRows - wordmark.lines.length) / 2);
  const leftPad = " ".repeat(size.columns + previewGap);
  const block = Array.makeBy(totalRows, (index) => {
    const bannerIndex = index - bannerTop;
    return `${leftPad}${wordmark.lines[bannerIndex] ?? ""}`;
  });

  return `\r${block.join("\n")}\n\x1b[${totalRows}A${transmit}\x1b[${totalRows}B\r`;
};

const composeKitty = ({
  base64,
  size,
  wordmark,
  terminalColumns,
}: ComposePreviewArgs) => {
  const transmit = buildKittyTransmitDisplay({
    base64,
    columns: size.columns,
    rows: size.rows,
  });
  const fitsBeside =
    wordmark.lines.length > 0 &&
    size.columns + previewGap + wordmark.width <= terminalColumns;

  return fitsBeside
    ? kittyBeside(transmit, size, wordmark)
    : kittyStacked(transmit, size, wordmark);
};

const composeIterm2 = ({
  base64,
  byteLength,
  size,
  wordmark,
}: ComposePreviewArgs) =>
  `${buildIterm2InlineSequence({ base64, byteLength, columns: size.columns })}${bannerBelow(wordmark)}`;

export const composePreview = (args: ComposePreviewArgs) =>
  Match.value(args.protocol).pipe(
    Match.when("kitty", () => composeKitty(args)),
    Match.orElse(() => composeIterm2(args)),
  );
