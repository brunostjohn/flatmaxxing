import type {
  IArcEntity,
  ICircleEntity,
  IDxf,
  IEllipseEntity,
  ILineEntity,
  ILwpolylineEntity,
  IPoint,
  IPointEntity,
  IPolylineEntity,
} from "dxf-parser";

type Box = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

type Coordinate = Pick<IPoint, "x" | "y">;
type LineEntity = ILineEntity & {
  start?: Coordinate;
  end?: Coordinate;
};

const CARDINAL_ANGLES = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2] as const;
const GEOMETRY_EPSILON = 1e-9;
const TAU = Math.PI * 2;

function emptyBox(): Box {
  return {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  };
}

function addPoint(box: Box, point: Coordinate | undefined) {
  if (!point) return;

  const { x, y } = point;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;

  box.minX = Math.min(box.minX, x);
  box.minY = Math.min(box.minY, y);
  box.maxX = Math.max(box.maxX, x);
  box.maxY = Math.max(box.maxY, y);
}

function addVertices(box: Box, vertices: readonly Coordinate[] | undefined) {
  for (const point of vertices ?? []) {
    addPoint(box, point);
  }
}

function addCircle(box: Box, center: Coordinate | undefined, radius: number) {
  if (!center || !Number.isFinite(radius)) return;

  const r = Math.abs(radius);
  addPoint(box, { x: center.x - r, y: center.y - r });
  addPoint(box, { x: center.x + r, y: center.y + r });
}

function addArc(box: Box, arc: IArcEntity) {
  if (
    !arc.center ||
    !Number.isFinite(arc.radius) ||
    !Number.isFinite(arc.startAngle) ||
    !Number.isFinite(arc.endAngle)
  ) {
    return;
  }

  const radius = Math.abs(arc.radius);
  const startAngle = normalizeAngle(arc.startAngle);
  const endAngle = normalizeAngle(arc.endAngle);
  const sweep = counterClockwiseSweep(arc.startAngle, arc.endAngle);

  if (sweep >= TAU - GEOMETRY_EPSILON) {
    addCircle(box, arc.center, radius);
    return;
  }

  addPoint(box, pointOnCircle(arc.center, radius, startAngle));
  addPoint(box, pointOnCircle(arc.center, radius, endAngle));

  for (const angle of CARDINAL_ANGLES) {
    if (isAngleOnCounterClockwiseArc(angle, startAngle, sweep)) {
      addPoint(box, pointOnCircle(arc.center, radius, angle));
    }
  }
}

function addEllipse(box: Box, ellipse: IEllipseEntity) {
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

function addFullEllipse(
  box: Box,
  center: Coordinate,
  major: Coordinate,
  minor: Coordinate,
) {
  const xExtent = Math.hypot(major.x, minor.x);
  const yExtent = Math.hypot(major.y, minor.y);

  addPoint(box, { x: center.x - xExtent, y: center.y - yExtent });
  addPoint(box, { x: center.x + xExtent, y: center.y + yExtent });
}

function ellipseCardinalAngles(major: Coordinate, minor: Coordinate): number[] {
  const xExtreme = Math.atan2(minor.x, major.x);
  const yExtreme = Math.atan2(minor.y, major.y);

  return [
    normalizeAngle(xExtreme),
    normalizeAngle(xExtreme + Math.PI),
    normalizeAngle(yExtreme),
    normalizeAngle(yExtreme + Math.PI),
  ];
}

function pointOnCircle(
  center: Coordinate,
  radius: number,
  angle: number,
): Coordinate {
  return {
    x: snapNearZero(center.x + radius * Math.cos(angle)),
    y: snapNearZero(center.y + radius * Math.sin(angle)),
  };
}

function pointOnEllipse(
  center: Coordinate,
  major: Coordinate,
  minor: Coordinate,
  angle: number,
): Coordinate {
  return {
    x: snapNearZero(
      center.x + major.x * Math.cos(angle) + minor.x * Math.sin(angle),
    ),
    y: snapNearZero(
      center.y + major.y * Math.cos(angle) + minor.y * Math.sin(angle),
    ),
  };
}

function normalizeAngle(angle: number) {
  const normalized = angle % TAU;
  return normalized < 0 ? normalized + TAU : normalized;
}

function counterClockwiseDistance(from: number, to: number) {
  return normalizeAngle(to - from);
}

function counterClockwiseSweep(startAngle: number, endAngle: number) {
  if (Math.abs(endAngle - startAngle) >= TAU - GEOMETRY_EPSILON) {
    return TAU;
  }

  return counterClockwiseDistance(
    normalizeAngle(startAngle),
    normalizeAngle(endAngle),
  );
}

function isAngleOnCounterClockwiseArc(
  angle: number,
  startAngle: number,
  sweep: number,
) {
  return (
    counterClockwiseDistance(startAngle, normalizeAngle(angle)) <=
    sweep + GEOMETRY_EPSILON
  );
}

function snapNearZero(value: number) {
  return Math.abs(value) < GEOMETRY_EPSILON ? 0 : value;
}

function hasBounds(box: Box) {
  return (
    Number.isFinite(box.minX) &&
    Number.isFinite(box.minY) &&
    Number.isFinite(box.maxX) &&
    Number.isFinite(box.maxY)
  );
}

export function getDxfBounds(dxf: IDxf): { width: number; height: number } {
  const box = emptyBox();

  for (const e of dxf.entities ?? []) {
    switch (e.type) {
      case "LINE": {
        const line = e as LineEntity;

        addVertices(box, line.vertices);
        addPoint(box, line.start);
        addPoint(box, line.end);

        break;
      }

      case "LWPOLYLINE":
      case "POLYLINE": {
        const polyline = e as ILwpolylineEntity | IPolylineEntity;

        addVertices(box, polyline.vertices);
        break;
      }

      case "CIRCLE": {
        const circle = e as ICircleEntity;

        addCircle(box, circle.center, circle.radius);
        break;
      }

      case "ARC": {
        addArc(box, e as IArcEntity);
        break;
      }

      case "ELLIPSE": {
        addEllipse(box, e as IEllipseEntity);
        break;
      }

      case "POINT": {
        const point = e as IPointEntity;

        addPoint(box, point.position);
        break;
      }

      default:
        // TEXT, SPLINE, HATCH, INSERT, etc ignored here.
        break;
    }
  }

  if (!hasBounds(box)) {
    throw new Error("No supported geometry found in DXF");
  }

  const dimensions = {
    width: box.maxX - box.minX,
    height: box.maxY - box.minY,
  };

  return dimensions;
}
