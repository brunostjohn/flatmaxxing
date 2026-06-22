import type { Coordinate, PathCmd } from "./gerberWriter";

const f = (n: number): string => {
  const s = n.toFixed(6);
  return s.replace(/\.?0+$/, "") || "0";
};

const pair = (code: number, value: string | number): string =>
  `${code}\n${value}\n`;

const lineEntity = (a: Coordinate, b: Coordinate): string =>
  pair(0, "LINE") +
  pair(8, "0") +
  pair(10, f(a.x)) +
  pair(20, f(a.y)) +
  pair(11, f(b.x)) +
  pair(21, f(b.y));

const deg = (rad: number): number => (rad * 180) / Math.PI;

const arcEntity = (
  from: Coordinate,
  to: Coordinate,
  center: Coordinate,
  cw: boolean,
): string => {
  const radius = Math.hypot(from.x - center.x, from.y - center.y);
  const aFrom = Math.atan2(from.y - center.y, from.x - center.x);
  const aTo = Math.atan2(to.y - center.y, to.x - center.x);
  const startDeg = deg(cw ? aTo : aFrom);
  const endDeg = deg(cw ? aFrom : aTo);
  return (
    pair(0, "ARC") +
    pair(8, "0") +
    pair(10, f(center.x)) +
    pair(20, f(center.y)) +
    pair(40, f(radius)) +
    pair(50, f(startDeg)) +
    pair(51, f(endDeg))
  );
};

export const dxfCircle = (center: Coordinate, radiusMm: number): string =>
  pair(0, "CIRCLE") +
  pair(8, "0") +
  pair(10, f(center.x)) +
  pair(20, f(center.y)) +
  pair(40, f(radiusMm));

export const renderDxfOutline = (
  start: Coordinate,
  cmds: readonly PathCmd[],
  extraEntities: readonly string[] = [],
): string => {
  let cursor = start;
  let entities = "";
  for (const cmd of cmds) {
    entities +=
      cmd.kind === "line"
        ? lineEntity(cursor, cmd.to)
        : arcEntity(cursor, cmd.to, cmd.center, cmd.cw);
    cursor = cmd.to;
  }
  for (const e of extraEntities) entities += e;

  return (
    pair(0, "SECTION") +
    pair(2, "HEADER") +
    pair(9, "$INSUNITS") +
    pair(70, 4) +
    pair(0, "ENDSEC") +
    pair(0, "SECTION") +
    pair(2, "ENTITIES") +
    entities +
    pair(0, "ENDSEC") +
    pair(0, "EOF")
  );
};
