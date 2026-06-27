import { DxfError } from "@/errors";
import type { IDxf, IEntity } from "dxf-parser";
import { Array, Match } from "effect";
import { addArc } from "./addArc";
import { addCircle } from "./addCircle";
import { addEllipse } from "./addEllipse";
import { addPoint } from "./addPoint";
import { addPolyline } from "./addPolyline";
import { addSpline } from "./addSpline";
import { addVertices } from "./addVertices";
import { emptyBox } from "./emptyBox";
import {
  isArcEntity,
  isCircleEntity,
  isEllipseEntity,
  isLineEntity,
  isPointEntity,
  isPolylineEntity,
  isSplineEntity,
} from "./entityGuards";
import { hasBounds } from "./hasBounds";
import type { Box } from "./types";

const accumulateEntity = (box: Box, entity: IEntity): Box =>
  Match.value(entity).pipe(
    Match.when(isLineEntity, (line) => {
      addVertices(box, line.vertices);
      addPoint(box, line.start);
      addPoint(box, line.end);
      return box;
    }),
    Match.when(isPolylineEntity, (polyline) => {
      addPolyline(box, polyline.vertices, polyline.shape === true);
      return box;
    }),
    Match.when(isCircleEntity, (circle) => {
      addCircle(box, circle.center, circle.radius);
      return box;
    }),
    Match.when(isArcEntity, (arc) => {
      addArc(box, arc);
      return box;
    }),
    Match.when(isEllipseEntity, (ellipse) => {
      addEllipse(box, ellipse);
      return box;
    }),
    Match.when(isSplineEntity, (spline) => {
      addSpline(box, spline);
      return box;
    }),
    Match.when(isPointEntity, (point) => {
      addPoint(box, point.position);
      return box;
    }),
    Match.orElse(() => box),
  );

export const getDxfBounds = (dxf: IDxf) => {
  const box = Array.reduce(dxf.entities ?? [], emptyBox(), accumulateEntity);

  if (!hasBounds(box)) {
    throw new DxfError({ message: "No supported geometry found in DXF" });
  }

  return {
    width: box.maxX - box.minX,
    height: box.maxY - box.minY,
  };
};
