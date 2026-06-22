import type { ILineEntity, IPoint } from "dxf-parser";

export type Box = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type Coordinate = Pick<IPoint, "x" | "y">;

export type LineEntity = ILineEntity & {
  start?: Coordinate;
  end?: Coordinate;
};
