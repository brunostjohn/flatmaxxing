import type { IEllipseEntity } from "dxf-parser";
import { Array, Result } from "effect";
import { addFullEllipse } from "./addFullEllipse";
import { addPoint } from "./addPoint";
import { GEOMETRY_EPSILON, TAU } from "./constants";
import { counterClockwiseSweep } from "./counterClockwiseSweep";
import { ellipseCardinalAngles } from "./ellipseCardinalAngles";
import { isAngleOnCounterClockwiseArc } from "./isAngleOnCounterClockwiseArc";
import { normalizeAngle } from "./normalizeAngle";
import { pointOnEllipse } from "./pointOnEllipse";
import type { Box } from "./types";

export const addEllipse = (box: Box, ellipse: IEllipseEntity) => {
  if (
    !ellipse.center ||
    !ellipse.majorAxisEndPoint ||
    !Number.isFinite(ellipse.axisRatio)
  ) {
    return;
  }

  const center = ellipse.center;
  const major = ellipse.majorAxisEndPoint;
  const minor = {
    x: -major.y * ellipse.axisRatio,
    y: major.x * ellipse.axisRatio,
  };

  if (
    !Number.isFinite(ellipse.startAngle) ||
    !Number.isFinite(ellipse.endAngle)
  ) {
    addFullEllipse(box, center, major, minor);
    return;
  }

  const startAngle = normalizeAngle(ellipse.startAngle);
  const endAngle = normalizeAngle(ellipse.endAngle);
  const sweep = counterClockwiseSweep(ellipse.startAngle, ellipse.endAngle);

  if (sweep >= TAU - GEOMETRY_EPSILON) {
    addFullEllipse(box, center, major, minor);
    return;
  }

  Array.forEach(
    [
      pointOnEllipse(center, major, minor, startAngle),
      pointOnEllipse(center, major, minor, endAngle),
      ...Array.filterMap(ellipseCardinalAngles(major, minor), (angle) =>
        isAngleOnCounterClockwiseArc(angle, startAngle, sweep)
          ? Result.succeed(pointOnEllipse(center, major, minor, angle))
          : Result.fail(null),
      ),
    ],
    (point) => addPoint(box, point),
  );
};
