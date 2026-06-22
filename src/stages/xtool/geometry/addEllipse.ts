import type { IEllipseEntity } from "dxf-parser";
import { addFullEllipse } from "./addFullEllipse";
import { addPoint } from "./addPoint";
import { GEOMETRY_EPSILON, TAU } from "./constants";
import { counterClockwiseSweep } from "./counterClockwiseSweep";
import { ellipseCardinalAngles } from "./ellipseCardinalAngles";
import { isAngleOnCounterClockwiseArc } from "./isAngleOnCounterClockwiseArc";
import { normalizeAngle } from "./normalizeAngle";
import { pointOnEllipse } from "./pointOnEllipse";
import type { Box } from "./types";

export function addEllipse(box: Box, ellipse: IEllipseEntity) {
  if (
    !ellipse.center ||
    !ellipse.majorAxisEndPoint ||
    !Number.isFinite(ellipse.axisRatio)
  ) {
    return;
  }

  const major = ellipse.majorAxisEndPoint;
  const minor = {
    x: -major.y * ellipse.axisRatio,
    y: major.x * ellipse.axisRatio,
  };

  if (
    !Number.isFinite(ellipse.startAngle) ||
    !Number.isFinite(ellipse.endAngle)
  ) {
    addFullEllipse(box, ellipse.center, major, minor);
    return;
  }

  const startAngle = normalizeAngle(ellipse.startAngle);
  const endAngle = normalizeAngle(ellipse.endAngle);
  const sweep = counterClockwiseSweep(ellipse.startAngle, ellipse.endAngle);

  if (sweep >= TAU - GEOMETRY_EPSILON) {
    addFullEllipse(box, ellipse.center, major, minor);
    return;
  }

  addPoint(box, pointOnEllipse(ellipse.center, major, minor, startAngle));
  addPoint(box, pointOnEllipse(ellipse.center, major, minor, endAngle));

  for (const angle of ellipseCardinalAngles(major, minor)) {
    if (isAngleOnCounterClockwiseArc(angle, startAngle, sweep)) {
      addPoint(box, pointOnEllipse(ellipse.center, major, minor, angle));
    }
  }
}
