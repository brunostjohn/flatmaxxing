import type { Coordinate } from "@/geometry/dxfWriter";
import {
  angleOf,
  circleFromThreePoints,
  isAngleBetweenClockwise,
} from "@/stages/kicad/board/kicadBoardBounds";
import { MissingAuxAxisOriginError } from "@/errors";
import { Array } from "effect";
import type { KicadPcb } from "kicadts";
import { JOIN_TOLERANCE_MM, MAX_BEZIER_SEGMENTS } from "./constants";
import type { Outline } from "./types";

export const samePoint = (a: Coordinate, b: Coordinate) =>
  Math.hypot(a.x - b.x, a.y - b.y) <= JOIN_TOLERANCE_MM;

export { angleOf, circleFromThreePoints, isAngleBetweenClockwise };

export const kicadToDxfTransform = (pcb: KicadPcb) => {
  const origin = pcb.setup?.auxAxisOrigin;
  if (!origin) {
    throw new MissingAuxAxisOriginError({
      message:
        "The board has no setup.aux_axis_origin; cannot place the edge-cut DXF. " +
        "Set the drill/place origin in KiCad (Place > Drill/Place File Origin) before exporting.",
    });
  }

  const auxX = origin.x;
  const auxY = origin.y;
  return (point: Coordinate) => ({ x: point.x - auxX, y: auxY - point.y });
};

const isOrientationReversing = (
  transform: (point: Coordinate) => Coordinate,
) => {
  const o = transform({ x: 0, y: 0 });
  const ux = transform({ x: 1, y: 0 });
  const uy = transform({ x: 0, y: 1 });
  const ax = ux.x - o.x;
  const ay = ux.y - o.y;
  const bx = uy.x - o.x;
  const by = uy.y - o.y;
  const determinant = ax * by - ay * bx;
  return determinant < 0;
};

export const transformOutline = (
  outline: Outline,
  transform: (point: Coordinate) => Coordinate,
): Outline => {
  const flipWinding = isOrientationReversing(transform);
  return {
    start: transform(outline.start),
    cmds: Array.map(outline.cmds, (cmd) =>
      cmd.kind === "line"
        ? { kind: "line", to: transform(cmd.to) }
        : {
            kind: "arc",
            to: transform(cmd.to),
            center: transform(cmd.center),
            cw: flipWinding ? !cmd.cw : cmd.cw,
          },
    ),
  };
};

const cubicAt = (
  p0: Coordinate,
  p1: Coordinate,
  p2: Coordinate,
  p3: Coordinate,
  t: number,
): Coordinate => {
  const u = 1 - t;
  const w0 = u * u * u;
  const w1 = 3 * u * u * t;
  const w2 = 3 * u * t * t;
  const w3 = t * t * t;
  return {
    x: w0 * p0.x + w1 * p1.x + w2 * p2.x + w3 * p3.x,
    y: w0 * p0.y + w1 * p1.y + w2 * p2.y + w3 * p3.y,
  };
};

const adaptiveSegmentCount = (
  p0: Coordinate,
  p1: Coordinate,
  p2: Coordinate,
  p3: Coordinate,
  tolerance: number,
) => {
  const ax = p0.x - 2 * p1.x + p2.x;
  const ay = p0.y - 2 * p1.y + p2.y;
  const bx = p1.x - 2 * p2.x + p3.x;
  const by = p1.y - 2 * p2.y + p3.y;
  const maxSecond = 6 * Math.max(Math.hypot(ax, ay), Math.hypot(bx, by));
  const ideal =
    maxSecond > 0 ? Math.ceil(Math.sqrt(maxSecond / (8 * tolerance))) : 1;
  return Math.max(1, Math.min(ideal, MAX_BEZIER_SEGMENTS));
};

export const flattenCubicAdaptive = (
  p0: Coordinate,
  p1: Coordinate,
  p2: Coordinate,
  p3: Coordinate,
  tolerance: number,
): Coordinate[] => {
  const segments = adaptiveSegmentCount(p0, p1, p2, p3, tolerance);
  return Array.makeBy(segments + 1, (i) =>
    cubicAt(p0, p1, p2, p3, i / segments),
  );
};
