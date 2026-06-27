import { Array } from "effect";
import { addPoint } from "./addPoint";
import type { Box, Coordinate } from "./types";

export const addVertices = (
  box: Box,
  vertices: readonly Coordinate[] | undefined,
) => Array.forEach(vertices ?? [], (point) => addPoint(box, point));
