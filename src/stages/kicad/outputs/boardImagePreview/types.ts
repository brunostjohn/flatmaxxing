export type InlineImageProtocol = "kitty" | "iterm2" | "none";

export interface PngDimensions {
  readonly width: number;
  readonly height: number;
}

export interface InlineImageSize {
  readonly columns: number;
  readonly rows: number;
}

export interface Wordmark {
  readonly lines: readonly string[];
  readonly width: number;
}
