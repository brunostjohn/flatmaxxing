import { render } from "cfonts";
import type { Wordmark } from "./types";

const ansiPattern = /\x1b\[[0-9;]*m/g;

const visibleWidth = (line: string) => line.replace(ansiPattern, "").length;

const isBlank = (line: string) => visibleWidth(line) === 0;

const trimBlankLines = (lines: readonly string[]) => {
  const start = lines.findIndex((line) => !isBlank(line));
  if (start === -1) {
    return [];
  }
  const end = lines.findLastIndex((line) => !isBlank(line));
  return lines.slice(start, end + 1);
};

export const renderWordmark = (text: string): Wordmark => {
  const result = render(text, { font: "tiny", space: false });
  if (!result) {
    return { lines: [], width: 0 };
  }

  const lines = trimBlankLines(result.string.split("\n"));
  return {
    lines,
    width: lines.length === 0 ? 0 : Math.max(...lines.map(visibleWidth)),
  };
};
