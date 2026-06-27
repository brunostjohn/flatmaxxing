import type { ISplineEntity } from "dxf-parser";
import { Array } from "effect";
import { addPoint } from "./addPoint";
import type { Box } from "./types";

export const addSpline = (box: Box, spline: ISplineEntity) =>
  Array.forEach(
    [...(spline.controlPoints ?? []), ...(spline.fitPoints ?? [])],
    (point) => addPoint(box, point),
  );
