import { Array, Match, Option, pipe, Record } from "effect";
import {
  APER_FUNCTION,
  DRILL_CODE,
  IN_TO_MM,
  LEADING_CODE,
  LINE_SPLIT,
  MIN_ROUTE_POINTS,
  MOVE_CODES,
  NON_PLATED,
  NO_TOOL,
  PLATED,
  PLUNGE_END_CODE,
  PLUNGE_START_CODE,
  RAPID_MOVE_CODE,
  TOOL_DEF,
  TOOL_DELETE,
  TOOL_SELECT,
  X_COORD,
  Y_COORD,
} from "./constants";
import type {
  ExcellonToken,
  Hole,
  ParsedExcellon,
  ParseState,
  Plating,
  Point,
  Units,
} from "./types";

const platingFromComment = (comment: string): Plating =>
  Match.value(comment).pipe(
    Match.when(
      (c) => NON_PLATED.test(c),
      () => "NPTH" as const,
    ),
    Match.when(
      (c) => PLATED.test(c),
      () => "PTH" as const,
    ),
    Match.orElse(() => "unknown" as const),
  );

const polylineLength = (path: readonly Point[]): number =>
  pipe(
    Array.zipWith(path, Array.drop(path, 1), (a, b) =>
      Math.hypot(b.x - a.x, b.y - a.y),
    ),
    Array.reduce(0, (total, segment) => total + segment),
  );

const matchNumber = (regex: RegExp, line: string): Option.Option<number> =>
  pipe(Option.fromUndefinedOr(regex.exec(line)?.[1]), Option.map(Number));

const commentToken = (line: string): ExcellonToken =>
  Match.value(line).pipe(
    Match.when(
      (c) => APER_FUNCTION.test(c),
      (c) => ({ _tag: "Plating" as const, plating: platingFromComment(c) }),
    ),
    Match.when(
      (c) => TOOL_DELETE.test(c),
      () => ({ _tag: "Plating" as const, plating: "unknown" as const }),
    ),
    Match.orElse(() => ({ _tag: "Ignored" as const })),
  );

const codeToken = (
  letter: string,
  num: number,
  x: Option.Option<number>,
  y: Option.Option<number>,
): ExcellonToken => {
  const hasCoord = Option.isSome(x) || Option.isSome(y);
  return Match.value({ letter, num, hasCoord }).pipe(
    Match.when({ letter: "M", num: PLUNGE_START_CODE }, () => ({
      _tag: "PlungeStart" as const,
    })),
    Match.when({ letter: "M", num: PLUNGE_END_CODE }, () => ({
      _tag: "PlungeEnd" as const,
    })),
    Match.when(
      ({ letter: l, num: n }) => l === "G" && MOVE_CODES.includes(n),
      ({ num: n }) => ({
        _tag: "Move" as const,
        rapid: n === RAPID_MOVE_CODE,
        x,
        y,
      }),
    ),
    Match.when({ letter: "G", num: DRILL_CODE, hasCoord: true }, () => ({
      _tag: "Drill" as const,
      x,
      y,
    })),
    Match.orElse(() => ({ _tag: "Ignored" as const })),
  );
};

const tokenize = (line: string): ExcellonToken => {
  const x = matchNumber(X_COORD, line);
  const y = matchNumber(Y_COORD, line);
  return Match.value(line).pipe(
    Match.when(
      (l) => l.startsWith(";"),
      (l) => commentToken(l),
    ),
    Match.whenOr("METRIC", "M71", () => ({
      _tag: "Units" as const,
      units: "metric" as const,
    })),
    Match.whenOr("INCH", "M72", () => ({
      _tag: "Units" as const,
      units: "inch" as const,
    })),
    Match.when(
      (l) => TOOL_DEF.test(l),
      (l) => {
        const def = TOOL_DEF.exec(l)!;
        return {
          _tag: "ToolDef" as const,
          tool: Number(def[1]),
          diameter: Number(def[2]),
        };
      },
    ),
    Match.when(
      (l) => LEADING_CODE.test(l),
      (l) => {
        const code = LEADING_CODE.exec(l)!;
        return codeToken(code[1]!, Number(code[2]), x, y);
      },
    ),
    Match.when(
      (l) => TOOL_SELECT.test(l),
      (l) => ({
        _tag: "Select" as const,
        tool: Number(TOOL_SELECT.exec(l)![1]),
      }),
    ),
    Match.when(
      () => Option.isSome(x) || Option.isSome(y),
      () => ({ _tag: "Drill" as const, x, y }),
    ),
    Match.orElse(() => ({ _tag: "Ignored" as const })),
  );
};

const initialState: ParseState = {
  units: "metric",
  pendingPlating: "unknown",
  tools: {},
  currentTool: Option.none(),
  lastX: 0,
  lastY: 0,
  route: Option.none(),
  holes: [],
};

const resolvedPoint = (
  state: ParseState,
  x: Option.Option<number>,
  y: Option.Option<number>,
): Point => ({
  x: Option.getOrElse(x, () => state.lastX),
  y: Option.getOrElse(y, () => state.lastY),
});

const drillAt = (state: ParseState, point: Point): ParseState =>
  pipe(
    Option.flatMap(state.currentTool, (tool) =>
      Option.map(Record.get(state.tools, String(tool)), (def) => ({
        tool,
        def,
      })),
    ),
    Option.match({
      onNone: () => ({ ...state, lastX: point.x, lastY: point.y }),
      onSome: ({ tool, def }) => ({
        ...state,
        lastX: point.x,
        lastY: point.y,
        holes: Array.append(state.holes, {
          kind: "circle" as const,
          plating: def.plating,
          diameter: def.diameter,
          x: point.x,
          y: point.y,
          tool,
        }),
      }),
    }),
  );

const finishRoute = (state: ParseState): ParseState =>
  pipe(
    Option.all({
      route: Option.filter(
        state.route,
        (path) => path.length >= MIN_ROUTE_POINTS,
      ),
      tool: state.currentTool,
    }),
    Option.flatMap(({ route, tool }) =>
      Option.map(Record.get(state.tools, String(tool)), (def) => ({
        route,
        tool,
        def,
      })),
    ),
    Option.match({
      onNone: () => ({ ...state, route: Option.none() }),
      onSome: ({ route, tool, def }) => ({
        ...state,
        route: Option.none(),
        holes: Array.append(state.holes, {
          kind: "slot" as const,
          plating: def.plating,
          width: def.diameter,
          path: route,
          length: polylineLength(route) + def.diameter,
          tool,
        }),
      }),
    }),
  );

const applyMove = (
  state: ParseState,
  rapid: boolean,
  x: Option.Option<number>,
  y: Option.Option<number>,
): ParseState => {
  const hasCoord = Option.isSome(x) || Option.isSome(y);
  return Match.value({ hasCoord }).pipe(
    Match.when({ hasCoord: false }, () => state),
    Match.orElse(() => {
      const point = resolvedPoint(state, x, y);
      const route = Option.filter(state.route, () => !rapid).pipe(
        Option.map((path) => Array.append(path, point)),
      );
      return {
        ...state,
        lastX: point.x,
        lastY: point.y,
        route: Option.orElse(route, () => state.route),
      };
    }),
  );
};

const step = (state: ParseState, token: ExcellonToken): ParseState =>
  Match.value(token).pipe(
    Match.tag("Units", (t) => ({ ...state, units: t.units })),
    Match.tag("Plating", (t) => ({ ...state, pendingPlating: t.plating })),
    Match.tag("ToolDef", (t) => ({
      ...state,
      pendingPlating: "unknown" as const,
      tools: Record.set(state.tools, String(t.tool), {
        diameter: t.diameter,
        plating: state.pendingPlating,
      }),
    })),
    Match.tag("Select", (t) => ({
      ...state,
      currentTool: t.tool === NO_TOOL ? Option.none() : Option.some(t.tool),
    })),
    Match.tag("Move", (t) => applyMove(state, t.rapid, t.x, t.y)),
    Match.tag("PlungeStart", () => ({
      ...state,
      route: Option.some([{ x: state.lastX, y: state.lastY }]),
    })),
    Match.tag("PlungeEnd", () => finishRoute(state)),
    Match.tag("Drill", (t) => drillAt(state, resolvedPoint(state, t.x, t.y))),
    Match.tag("Ignored", () => state),
    Match.exhaustive,
  );

const scaleHoleToMm = (hole: Hole): Hole =>
  Match.value(hole).pipe(
    Match.when({ kind: "circle" }, (circle) => ({
      ...circle,
      diameter: circle.diameter * IN_TO_MM,
      x: circle.x * IN_TO_MM,
      y: circle.y * IN_TO_MM,
    })),
    Match.orElse((slot) => {
      const path = Array.map(slot.path, (p) => ({
        x: p.x * IN_TO_MM,
        y: p.y * IN_TO_MM,
      }));
      return {
        ...slot,
        width: slot.width * IN_TO_MM,
        path,
        length: polylineLength(path) + slot.width * IN_TO_MM,
      };
    }),
  );

const toMillimetres = (units: Units, holes: readonly Hole[]): readonly Hole[] =>
  Match.value(units).pipe(
    Match.when("inch", () => Array.map(holes, scaleHoleToMm)),
    Match.orElse(() => holes),
  );

export const parseExcellon = (text: string): ParsedExcellon => {
  const tokens = Array.map(text.split(LINE_SPLIT), (raw) =>
    tokenize(raw.trim()),
  );
  const [state] = Array.mapAccum(tokens, initialState, (acc, token) => {
    const next = step(acc, token);
    return [next, undefined];
  });
  return { units: state.units, holes: toMillimetres(state.units, state.holes) };
};
