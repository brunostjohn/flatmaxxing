import { formatDia } from "@/cnc/cncJobPlan";
import { Array, Option, Order, pipe, Record } from "effect";
import { EPS } from "./constants";
import type {
  CategorizedGroup,
  CategorizeResult,
  Hole,
  Method,
  ResolvedHole,
  ResolveResult,
  RoundUpEvent,
  ToolDiameter,
  ToolInventory,
  UnmachinableHole,
} from "./types";

const ascending = (tools: readonly ToolDiameter[]): readonly number[] =>
  pipe(
    Array.map(tools, (t) => t.diameter),
    Array.sort(Order.Number),
  );

const largestFitting = (
  diameters: readonly number[],
  limit: number,
): Option.Option<number> =>
  pipe(
    Array.filter(diameters, (d) => d <= limit + EPS),
    Array.match({
      onEmpty: () => Option.none(),
      onNonEmpty: (fitting) => Option.some(Math.max(...fitting)),
    }),
  );

const resolveSlot = (
  width: number,
  millDias: readonly number[],
): ResolveResult =>
  Option.match(largestFitting(millDias, width), {
    onNone: () => ({
      ok: false,
      reason: `${formatDia(width)}mm-wide slot: no cornmill ≤ ${formatDia(
        width,
      )}mm to mill it`,
    }),
    onSome: (mill) => ({
      ok: true,
      method: "pocket",
      toolDiameter: mill,
      roundedUp: false,
    }),
  });

const resolveCircle = (
  diameter: number,
  drillDias: readonly number[],
  millDias: readonly number[],
  toleranceMm: number,
): ResolveResult =>
  pipe(
    Array.findFirst(
      drillDias,
      (b) => b >= diameter - EPS && b <= diameter + toleranceMm + EPS,
    ),
    Option.map<number, ResolveResult>((bit) => ({
      ok: true,
      method: "drill",
      toolDiameter: bit,
      roundedUp: bit > diameter + EPS,
    })),
    Option.orElse(() =>
      Option.map<number, ResolveResult>(
        largestFitting(millDias, diameter),
        (mill) => ({
          ok: true,
          method: "pocket",
          toolDiameter: mill,
          roundedUp: false,
        }),
      ),
    ),
    Option.getOrElse<ResolveResult>(() => ({
      ok: false,
      reason: `Ø${formatDia(diameter)}mm: no drill in [${formatDia(
        diameter,
      )}, ${formatDia(diameter + toleranceMm)}]mm and no cornmill ≤ ${formatDia(
        diameter,
      )}mm`,
    })),
  );

export const resolveHoleTool = (
  hole: Hole,
  { drills, mills, toleranceMm }: ToolInventory,
): ResolveResult => {
  const millDias = ascending(mills);
  return hole.kind === "slot"
    ? resolveSlot(hole.width, millDias)
    : resolveCircle(hole.diameter, ascending(drills), millDias, toleranceMm);
};

const methodWord = (method: Method): string =>
  method === "drill" ? "drills" : "pockets";

const categoryFor = (hole: Hole, override: Option.Option<string>): string =>
  Option.getOrElse(override, () =>
    hole.plating === "unknown" ? "PTH" : hole.plating,
  );

const groupKey = (resolved: ResolvedHole): string => {
  const { result, category } = resolved;
  return result.ok
    ? `${category}|${result.method}|${formatDia(result.toolDiameter)}`
    : "";
};

const groupOrder = pipe(
  Order.mapInput(Order.String, (g: CategorizedGroup) => g.category),
  Order.combine(
    Order.mapInput(Order.String, (g: CategorizedGroup) => g.method),
  ),
  Order.combine(
    Order.mapInput(Order.Number, (g: CategorizedGroup) => g.toolDiameter),
  ),
);

const roundUpOrder = pipe(
  Order.mapInput(Order.Number, (e: RoundUpEvent) => e.trueDiameter),
  Order.combine(Order.mapInput(Order.Number, (e: RoundUpEvent) => e.x)),
  Order.combine(Order.mapInput(Order.Number, (e: RoundUpEvent) => e.y)),
);

const buildGroup = (resolved: readonly ResolvedHole[]): CategorizedGroup => {
  const head = resolved[0]!;
  const { category, result } = head;
  const method = result.ok ? result.method : "drill";
  const toolDiameter = result.ok ? result.toolDiameter : 0;
  return {
    category,
    method,
    toolDiameter,
    fileSuffix: `${category}-${methodWord(method)}-${formatDia(toolDiameter)}mm`,
    holes: Array.map(resolved, (r) => r.hole),
  };
};

const roundUpFor = (resolved: ResolvedHole): Option.Option<RoundUpEvent> => {
  const { hole, category, result } = resolved;
  return result.ok && result.roundedUp && hole.kind === "circle"
    ? Option.some({
        category,
        plating: hole.plating,
        x: hole.x,
        y: hole.y,
        trueDiameter: hole.diameter,
        bitDiameter: result.toolDiameter,
        delta: result.toolDiameter - hole.diameter,
      })
    : Option.none();
};

export const categorizeHoles = (
  holes: readonly Hole[],
  inventory: ToolInventory,
  options: { readonly categoryOverride?: string } = {},
): CategorizeResult => {
  const override = Option.fromUndefinedOr(options.categoryOverride);
  const resolved = Array.map(
    holes,
    (hole): ResolvedHole => ({
      hole,
      category: categoryFor(hole, override),
      result: resolveHoleTool(hole, inventory),
    }),
  );

  const machinable = Array.filter(resolved, (r) => r.result.ok);
  const unmachinable: readonly UnmachinableHole[] = pipe(
    Array.filter(resolved, (r) => !r.result.ok),
    Array.map((r) => ({
      hole: r.hole,
      category: r.category,
      reason: r.result.ok ? "" : r.result.reason,
    })),
  );

  const groups = pipe(
    Array.groupBy(machinable, groupKey),
    Record.values,
    Array.map(buildGroup),
    Array.sort(groupOrder),
  );

  const roundUps = pipe(
    Array.map(machinable, roundUpFor),
    Array.getSomes,
    Array.sort(roundUpOrder),
  );

  return { groups, unmachinable, roundUps };
};

const reportHeader = (board: string): readonly string[] => [
  `flatmaxx — drill sizes ROUNDED UP for ${board}`,
  "",
  "No exact-size drill bit existed for these holes, so the next larger bit",
  "(within tolerance) was used. The finished hole is OVERSIZE. On a small",
  "board even +0.05mm can break into adjacent copper or loosen a part fit —",
  "review every line below before machining.",
  "",
];

const reportLine = (event: RoundUpEvent): string =>
  `  ${formatDia(event.trueDiameter)}mm ${event.category} @ (${formatDia(
    event.x,
  )}, ${formatDia(event.y)}) → drilled ${formatDia(
    event.bitDiameter,
  )}mm (+${formatDia(event.delta)})`;

export const renderRoundedUpReport = (
  board: string,
  events: readonly RoundUpEvent[],
): string =>
  pipe(
    [...reportHeader(board), ...Array.map(events, reportLine), ""],
    Array.join("\n"),
  );
