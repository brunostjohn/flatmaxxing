import { axFind } from "@/macos";
import { Effect } from "effect";
import type { ExportRow } from "./types";

const isNumericTitle = (title: string) => /^\d+$/.test(title.trim());

export const readToolNumberColumn = Effect.fnUntraced(function* (pid: number) {
  const cells = yield* axFind(pid, {
    role: "AXStaticText",
    underTitle: "Export ToolPaths",
  });

  const numberCells = cells.filter((cell) =>
    Object.values(cell.titles).some(isNumericTitle),
  );
  if (numberCells.length === 0) return [] as readonly ExportRow[];

  const maxX = Math.max(...numberCells.map((cell) => cell.x));
  const colCells = numberCells.filter((cell) => Math.abs(cell.x - maxX) < 40);

  return colCells
    .slice()
    .sort((a, b) => a.y - b.y)
    .map((cell) => ({
      toolNumberCell: cell,
      value: (Object.values(cell.titles).find(isNumericTitle) ?? "").trim(),
    })) satisfies readonly ExportRow[];
});
