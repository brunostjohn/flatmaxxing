import { Array } from "effect";
import { kittyChunkSize } from "./constants";
import type { InlineImageSize } from "./types";

interface KittyTransmitArgs extends InlineImageSize {
  readonly base64: string;
}

const chunkControl = (
  index: number,
  isLast: boolean,
  { columns, rows }: InlineImageSize,
) =>
  index === 0
    ? `a=T,f=100,t=d,c=${columns},r=${rows},C=1,q=2,m=${isLast ? 0 : 1}`
    : `m=${isLast ? 0 : 1}`;

export const buildKittyTransmitDisplay = ({
  base64,
  columns,
  rows,
}: KittyTransmitArgs) => {
  const chunkCount = Math.max(1, Math.ceil(base64.length / kittyChunkSize));
  return Array.makeBy(chunkCount, (index) => {
    const payload = base64.slice(
      index * kittyChunkSize,
      (index + 1) * kittyChunkSize,
    );
    const control = chunkControl(index, index === chunkCount - 1, {
      columns,
      rows,
    });
    return `\x1b_G${control};${payload}\x1b\\`;
  }).join("");
};
