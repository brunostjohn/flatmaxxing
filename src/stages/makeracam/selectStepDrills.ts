import { Array, Order, Result } from "effect";
import type { MakeracamStep, ParsedDrillFilename } from "./types";

export const parseDrillFilename = (
  name: string,
): ParsedDrillFilename | undefined => {
  if (!name.toLowerCase().endsWith(".drl")) return undefined;
  const stem = name.slice(0, name.length - ".drl".length);

  const lastUnderscore = stem.lastIndexOf("_");
  if (lastUnderscore <= 0) return undefined;

  const board = stem.slice(0, lastUnderscore);
  const suffix = stem.slice(lastUnderscore + 1);

  const match = suffix.match(/^([^-]+)-([^-]+)-([0-9]*\.?[0-9]+)mm$/);
  if (match === null) return undefined;

  const [, category, method, diaRaw] = match;
  if (category === undefined || method === undefined || diaRaw === undefined) {
    return undefined;
  }

  const diameterMm = Number.parseFloat(diaRaw);
  if (!Number.isFinite(diameterMm)) return undefined;

  return { board, category, method, diameterMm };
};

const STEP_CATEGORIES: Record<MakeracamStep, readonly string[]> = {
  plated: ["alignment", "PTH"],
  final: ["NPTH"],
};

export interface SelectedDrill extends ParsedDrillFilename {
  readonly file: string;
}

export const selectStepDrills = (
  files: readonly string[],
  board: string,
  step: MakeracamStep,
): readonly SelectedDrill[] => {
  const wanted = STEP_CATEGORIES[step];

  const selected = Array.filterMap(files, (file) => {
    const parsed = parseDrillFilename(file);
    const matches =
      parsed !== undefined &&
      parsed.board === board &&
      wanted.includes(parsed.category);
    return matches
      ? Result.succeed({ ...parsed, file })
      : Result.fail(undefined);
  });

  const methodRank = (method: string) => (method === "drills" ? 0 : 1);
  return Array.sortBy(
    Order.mapInput(Order.Number, (drill: SelectedDrill) =>
      methodRank(drill.method),
    ),
    Order.mapInput(Order.Number, (drill: SelectedDrill) => drill.diameterMm),
    Order.mapInput(Order.String, (drill: SelectedDrill) => drill.category),
  )(selected);
};

export const magazineCategoryFor = (method: string): "Drill" | "Corn Bits" =>
  method === "drills" ? "Drill" : "Corn Bits";
