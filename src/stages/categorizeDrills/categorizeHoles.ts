import { formatDia } from "@/cnc/cncJobPlan";
import type { Hole, Plating } from "./parseExcellon";

/** How a hole gets physically made. */
export type Method = "drill" | "pocket";

export interface ToolInventory {
  /** Available drill bits (diameters, mm). */
  readonly drills: readonly { readonly diameter: number }[];
  /** Available cornmills/endmills for pocketing (diameters, mm). */
  readonly mills: readonly { readonly diameter: number }[];
  /** Max oversize allowed when rounding a hole up to a bit (mm). */
  readonly toleranceMm: number;
}

export type ResolveResult =
  | {
      readonly ok: true;
      readonly method: Method;
      readonly toolDiameter: number;
      /** True only for a drill whose bit is larger than the hole. */
      readonly roundedUp: boolean;
    }
  | { readonly ok: false; readonly reason: string };

const EPS = 1e-6;

const ascending = (tools: readonly { readonly diameter: number }[]): number[] =>
  tools.map((t) => t.diameter).sort((a, b) => a - b);

/** Largest available diameter that fits within `limit` (≤ limit). */
const largestFitting = (
  diameters: readonly number[],
  limit: number,
): number | undefined => {
  const fitting = diameters.filter((d) => d <= limit + EPS);
  return fitting.length > 0 ? Math.max(...fitting) : undefined;
};

/**
 * Decide how one hole is made with the tools on hand:
 *  - **circle**: prefer the *smallest* drill in `[D, D + tolerance]` (round up,
 *    never undersize); failing that, the largest cornmill ≤ D as a pocket.
 *  - **slot**: always a pocket — the largest cornmill ≤ its width (you cannot
 *    drill an oblong).
 * Returns `{ ok: false }` when nothing on hand can make it.
 */
export const resolveHoleTool = (
  hole: Hole,
  { drills, mills, toleranceMm }: ToolInventory,
): ResolveResult => {
  const millDias = ascending(mills);

  if (hole.kind === "slot") {
    const mill = largestFitting(millDias, hole.width);
    if (mill !== undefined) {
      return {
        ok: true,
        method: "pocket",
        toolDiameter: mill,
        roundedUp: false,
      };
    }
    return {
      ok: false,
      reason: `${formatDia(hole.width)}mm-wide slot: no cornmill ≤ ${formatDia(
        hole.width,
      )}mm to mill it`,
    };
  }

  const d = hole.diameter;
  const bit = ascending(drills).find(
    (b) => b >= d - EPS && b <= d + toleranceMm + EPS,
  );
  if (bit !== undefined) {
    return {
      ok: true,
      method: "drill",
      toolDiameter: bit,
      roundedUp: bit > d + EPS,
    };
  }

  const mill = largestFitting(millDias, d);
  if (mill !== undefined) {
    return { ok: true, method: "pocket", toolDiameter: mill, roundedUp: false };
  }

  return {
    ok: false,
    reason: `Ø${formatDia(d)}mm: no drill in [${formatDia(d)}, ${formatDia(
      d + toleranceMm,
    )}]mm and no cornmill ≤ ${formatDia(d)}mm`,
  };
};

export interface CategorizedGroup {
  /** "PTH" | "NPTH" | "alignment" (or a caller override). */
  readonly category: string;
  readonly method: Method;
  readonly toolDiameter: number;
  /** Filename body, e.g. `PTH-drills-0.4mm`. */
  readonly fileSuffix: string;
  readonly holes: readonly Hole[];
}

export interface RoundUpEvent {
  readonly category: string;
  readonly plating: Plating;
  readonly x: number;
  readonly y: number;
  readonly trueDiameter: number;
  readonly bitDiameter: number;
  readonly delta: number;
}

export interface UnmachinableHole {
  readonly hole: Hole;
  readonly category: string;
  readonly reason: string;
}

export interface CategorizeResult {
  readonly groups: readonly CategorizedGroup[];
  readonly unmachinable: readonly UnmachinableHole[];
  readonly roundUps: readonly RoundUpEvent[];
}

const methodWord = (method: Method): string =>
  method === "drill" ? "drills" : "pockets";

/** Plating → filename category. Unknown plating is treated as plated (safe default). */
const categoryFor = (hole: Hole, override: string | undefined): string =>
  override ?? (hole.plating === "unknown" ? "PTH" : hole.plating);

/**
 * Resolve every hole to a tool and bucket them into one group per
 * (category × method × tool). Also surfaces holes nothing can make and every
 * oversize ("rounded-up") drill so the caller can warn + persist them.
 */
export const categorizeHoles = (
  holes: readonly Hole[],
  inventory: ToolInventory,
  options: { readonly categoryOverride?: string } = {},
): CategorizeResult => {
  const groups = new Map<
    string,
    { category: string; method: Method; toolDiameter: number; holes: Hole[] }
  >();
  const unmachinable: UnmachinableHole[] = [];
  const roundUps: RoundUpEvent[] = [];

  for (const hole of holes) {
    const category = categoryFor(hole, options.categoryOverride);
    const res = resolveHoleTool(hole, inventory);
    if (!res.ok) {
      unmachinable.push({ hole, category, reason: res.reason });
      continue;
    }

    const key = `${category}|${res.method}|${formatDia(res.toolDiameter)}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        category,
        method: res.method,
        toolDiameter: res.toolDiameter,
        holes: [],
      };
      groups.set(key, group);
    }
    group.holes.push(hole);

    if (res.roundedUp && hole.kind === "circle") {
      roundUps.push({
        category,
        plating: hole.plating,
        x: hole.x,
        y: hole.y,
        trueDiameter: hole.diameter,
        bitDiameter: res.toolDiameter,
        delta: res.toolDiameter - hole.diameter,
      });
    }
  }

  const built: CategorizedGroup[] = [...groups.values()]
    .map((g) => ({
      category: g.category,
      method: g.method,
      toolDiameter: g.toolDiameter,
      fileSuffix: `${g.category}-${methodWord(g.method)}-${formatDia(
        g.toolDiameter,
      )}mm`,
      holes: g.holes,
    }))
    // Deterministic ordering: category, drills before pockets, then size.
    .sort(
      (a, b) =>
        a.category.localeCompare(b.category) ||
        a.method.localeCompare(b.method) ||
        a.toolDiameter - b.toolDiameter,
    );

  roundUps.sort(
    (a, b) => a.trueDiameter - b.trueDiameter || a.x - b.x || a.y - b.y,
  );

  return { groups: built, unmachinable, roundUps };
};

const fmtCoord = (value: number): string => formatDia(value);

/**
 * The persistent `ROUNDED_UP.txt` body — a loud, plain-text manifest of every
 * hole drilled oversize, so the operator can eyeball each before cutting.
 */
export const renderRoundedUpReport = (
  board: string,
  events: readonly RoundUpEvent[],
): string => {
  const lines = [
    `flatmaxx — drill sizes ROUNDED UP for ${board}`,
    "",
    "No exact-size drill bit existed for these holes, so the next larger bit",
    "(within tolerance) was used. The finished hole is OVERSIZE. On a small",
    "board even +0.05mm can break into adjacent copper or loosen a part fit —",
    "review every line below before machining.",
    "",
  ];
  for (const e of events) {
    lines.push(
      `  ${formatDia(e.trueDiameter)}mm ${e.category} @ (${fmtCoord(
        e.x,
      )}, ${fmtCoord(e.y)}) → drilled ${formatDia(e.bitDiameter)}mm (+${formatDia(
        e.delta,
      )})`,
    );
  }
  lines.push("");
  return lines.join("\n");
};
