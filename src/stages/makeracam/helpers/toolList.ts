import { MakeraCamError } from "@/errors";
import { axFind, clickAt } from "@/macos";
import { Effect } from "effect";
import { SETTLE } from "../constants";
import { scrollIntoBand } from "./scrollIntoBand";

const DIAMETER_EPSILON = 1e-6;

export const diaPrefix = (label: string) => {
  const beforeStar = label.split("*")[0] ?? "";
  const match = beforeStar.match(/([0-9]*\.?[0-9]+)/);
  return match?.[1] !== undefined ? Number.parseFloat(match[1]) : Number.NaN;
};

const toolListTable = Effect.fnUntraced(function* (pid: number) {
  const tables = (yield* axFind(pid, { role: "AXTable" }))
    .filter((table) => table.x < 900)
    .sort((a, b) => a.y - b.y);
  return tables[0];
});

export const selectToolRow = Effect.fnUntraced(function* (
  pid: number,
  diaMm: number,
  category: string,
) {
  const table = yield* toolListTable(pid);
  if (table === undefined) {
    return yield* Effect.fail(
      new MakeraCamError({ message: "Tool Magazine: no tool-list table" }),
    );
  }

  const target = yield* scrollIntoBand(
    () =>
      axFind(pid, { role: "AXStaticText", underTitle: "Tool Magazine" }).pipe(
        Effect.map((cells) =>
          cells.find((cell) =>
            Object.values(cell.titles).some(
              (title) => Math.abs(diaPrefix(title) - diaMm) < DIAMETER_EPSILON,
            ),
          ),
        ),
      ),
    {
      bandTop: table.y + 8,
      bandBottom: table.y + table.h - 18,
      anchor: {
        x: table.x + Math.round(table.w / 2),
        y: table.y + Math.round(table.h / 2),
      },
      maxTries: 12,
      settle: SETTLE,
      notFound: `Tool Magazine: no ${category} row with diameter ${diaMm}`,
      outOfReach: `Tool Magazine: could not scroll the ${diaMm}mm row into view`,
    },
  );

  yield* clickAt({ x: target.cx, y: target.cy });
});
