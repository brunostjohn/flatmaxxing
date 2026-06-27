import type { Coordinate, PathCmd } from "@/geometry/dxfWriter";

export interface Outline {
  readonly start: Coordinate;
  readonly cmds: PathCmd[];
}

export type Edge =
  | {
      readonly kind: "line";
      readonly start: Coordinate;
      readonly end: Coordinate;
    }
  | {
      readonly kind: "arc";
      readonly start: Coordinate;
      readonly end: Coordinate;
      readonly center: Coordinate;
      readonly cw: boolean;
    };
