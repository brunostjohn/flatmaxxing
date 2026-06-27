import type { PathCmd } from "@/geometry/dxfWriter";
import { EdgeCutsError } from "@/errors";
import { Array, Option } from "effect";
import { reverseEdge } from "./edges";
import { samePoint } from "./geometry";
import type { Edge, Outline } from "./types";

const cmdOf = (edge: Edge): PathCmd =>
  edge.kind === "line"
    ? { kind: "line", to: edge.end }
    : { kind: "arc", to: edge.end, center: edge.center, cw: edge.cw };

const closeCmd = (cmd: PathCmd, to: PathCmd["to"]): PathCmd =>
  cmd.kind === "line"
    ? { kind: "line", to }
    : { kind: "arc", to, center: cmd.center, cw: cmd.cw };

const walk = (
  remaining: readonly Edge[],
  ordered: readonly Edge[],
  frontier: Edge["end"],
): readonly Edge[] => {
  if (remaining.length === 0) return ordered;

  const index = remaining.findIndex(
    (edge) => samePoint(edge.start, frontier) || samePoint(edge.end, frontier),
  );
  if (index === -1) {
    throw new EdgeCutsError({
      message:
        `Edge.Cuts outline is not a single closed loop: a gap remains at ` +
        `(${frontier.x.toFixed(3)}, ${frontier.y.toFixed(3)}). ` +
        `Check that the board outline has no breaks or stray Edge.Cuts segments.`,
    });
  }

  const edge = remaining[index]!;
  const oriented = samePoint(edge.start, frontier) ? edge : reverseEdge(edge);
  return walk(
    Array.remove(remaining, index),
    Array.append(ordered, oriented),
    oriented.end,
  );
};

export const chainIntoLoop = (edges: readonly Edge[]): Outline => {
  if (!Array.isReadonlyArrayNonEmpty(edges)) {
    throw new EdgeCutsError({
      message:
        "No connectable Edge.Cuts geometry was found to build a board outline.",
    });
  }

  const first = Array.headNonEmpty(edges);
  const loopStart = first.start;
  const ordered = walk(Array.drop(edges, 1), [first], first.end);

  const frontier = ordered[ordered.length - 1]!.end;
  if (!samePoint(frontier, loopStart)) {
    throw new EdgeCutsError({
      message:
        `Edge.Cuts outline does not close: it ends at ` +
        `(${frontier.x.toFixed(3)}, ${frontier.y.toFixed(3)}) but started at ` +
        `(${loopStart.x.toFixed(3)}, ${loopStart.y.toFixed(3)}).`,
    });
  }

  const cmds = Array.map(ordered, cmdOf);
  const closed = Option.match(Array.last(cmds), {
    onNone: () => cmds,
    onSome: (last) => [...cmds.slice(0, -1), closeCmd(last, loopStart)],
  });

  return { start: loopStart, cmds: closed };
};
