interface Iterm2InlineArgs {
  readonly base64: string;
  readonly byteLength: number;
  readonly columns: number;
}

export const buildIterm2InlineSequence = ({
  base64,
  byteLength,
  columns,
}: Iterm2InlineArgs) =>
  `\r\x1b]1337;File=inline=1;size=${byteLength};width=${columns};preserveAspectRatio=1:${base64}\x07\n`;
