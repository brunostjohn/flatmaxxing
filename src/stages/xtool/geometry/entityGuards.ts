import type {
  IArcEntity,
  ICircleEntity,
  IEllipseEntity,
  IEntity,
  ILwpolylineEntity,
  IPointEntity,
  IPolylineEntity,
  ISplineEntity,
} from "dxf-parser";
import type { LineEntity } from "./types";

export const isLineEntity = (entity: IEntity): entity is LineEntity =>
  entity.type === "LINE";

export const isPolylineEntity = (
  entity: IEntity,
): entity is ILwpolylineEntity | IPolylineEntity =>
  entity.type === "LWPOLYLINE" || entity.type === "POLYLINE";

export const isCircleEntity = (entity: IEntity): entity is ICircleEntity =>
  entity.type === "CIRCLE";

export const isArcEntity = (entity: IEntity): entity is IArcEntity =>
  entity.type === "ARC";

export const isEllipseEntity = (entity: IEntity): entity is IEllipseEntity =>
  entity.type === "ELLIPSE";

export const isSplineEntity = (entity: IEntity): entity is ISplineEntity =>
  entity.type === "SPLINE";

export const isPointEntity = (entity: IEntity): entity is IPointEntity =>
  entity.type === "POINT";
