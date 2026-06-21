import { cubicBezierBoundsPoints } from "@/geometry/cubicBezierBounds";
import { BoardValidationError } from "@/stages/boardValidation/boardValidationTypes";
import {
	At,
	PtsArc,
	type Footprint,
	type FpArc,
	type FpCircle,
	type FpCurve,
	type FpLine,
	type FpPoly,
	type FpRect,
	type GrCurve,
	type GrPoly,
	type KicadPcb,
	type Layer,
} from "kicadts";

export type Coordinate = {
	readonly x: number;
	readonly y: number;
};

export type BoardBounds = {
	readonly minX: number;
	readonly minY: number;
	readonly maxX: number;
	readonly maxY: number;
};

type MutableBoardBounds = {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
};

type PointTransform = (point: Coordinate) => Coordinate;

const CARDINAL_ANGLES = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2] as const;
const GEOMETRY_EPSILON = 1e-9;

export const getBottomLeftBoardOrigin = (pcb: KicadPcb): Coordinate => {
	const bounds = findEdgeCutsBounds(pcb);
	return { x: bounds.minX, y: bounds.maxY };
};

export const findEdgeCutsBounds = (pcb: KicadPcb): BoardBounds => {
	const bounds = createEmptyBounds();

	for (const line of pcb.graphicLines) {
		if (!isEdgeCutsLayer(line.layer)) continue;
		includeLine(bounds, line.startPoint, line.endPoint);
	}

	for (const rect of pcb.graphicRects) {
		if (!isEdgeCutsLayer(rect.layer)) continue;
		includeRect(bounds, rect.startPoint, rect.endPoint);
	}

	for (const circle of pcb.graphicCircles) {
		if (!isEdgeCutsLayer(circle.layer)) continue;
		includeCircle(bounds, circle.centerPoint, circle.endPoint);
	}

	for (const arc of pcb.graphicArcs) {
		if (!isEdgeCutsLayer(arc.layer)) continue;
		includeArc(bounds, arc.startPoint, arc.midPoint, arc.endPoint);
	}

	for (const poly of pcb.graphicPolys) {
		if (!isEdgeCutsLayer(poly.layer)) continue;
		includePoly(bounds, poly);
	}

	for (const curve of pcb.graphicCurves) {
		if (!isEdgeCutsLayer(curve.layer)) continue;
		includeCurve(bounds, curve, identityTransform);
	}

	for (const footprint of pcb.footprints) {
		includeFootprintEdgeCuts(bounds, footprint);
	}

	if (!hasBounds(bounds)) {
		throw new BoardValidationError(
			"No Edge.Cuts geometry was found, so the board origin cannot be inferred.",
		);
	}

	return bounds;
};

const includeFootprintEdgeCuts = (
	bounds: MutableBoardBounds,
	footprint: Footprint,
) => {
	const transform = getFootprintTransform(footprint);

	for (const line of footprint.fpLines) {
		if (!isEdgeCutsLayer(line.layer)) continue;
		includeFootprintLine(bounds, line, transform);
	}

	for (const rect of footprint.fpRects) {
		if (!isEdgeCutsLayer(rect.layer)) continue;
		includeFootprintRect(bounds, rect, transform);
	}

	for (const circle of footprint.fpCircles) {
		if (!isEdgeCutsLayer(circle.layer)) continue;
		includeFootprintCircle(bounds, circle, transform);
	}

	for (const arc of footprint.fpArcs) {
		if (!isEdgeCutsLayer(arc.layer)) continue;
		includeFootprintArc(bounds, arc, transform);
	}

	for (const poly of footprint.fpPolys) {
		if (!isEdgeCutsLayer(poly.layer)) continue;
		includeFootprintPoly(bounds, poly, transform);
	}

	for (const curve of footprint.fpCurves) {
		if (!isEdgeCutsLayer(curve.layer)) continue;
		includeCurve(bounds, curve, transform);
	}
};

const isEdgeCutsLayer = (layer: Layer | undefined) =>
	layer?.names.includes("Edge.Cuts") ?? false;

const createEmptyBounds = (): MutableBoardBounds => ({
	minX: Number.POSITIVE_INFINITY,
	minY: Number.POSITIVE_INFINITY,
	maxX: Number.NEGATIVE_INFINITY,
	maxY: Number.NEGATIVE_INFINITY,
});

const hasBounds = (bounds: MutableBoardBounds) =>
	Number.isFinite(bounds.minX) &&
	Number.isFinite(bounds.minY) &&
	Number.isFinite(bounds.maxX) &&
	Number.isFinite(bounds.maxY);

const includePoint = (
	bounds: MutableBoardBounds,
	point: Coordinate | undefined,
) => {
	if (!point) return;
	bounds.minX = Math.min(bounds.minX, point.x);
	bounds.minY = Math.min(bounds.minY, point.y);
	bounds.maxX = Math.max(bounds.maxX, point.x);
	bounds.maxY = Math.max(bounds.maxY, point.y);
};

const includeLine = (
	bounds: MutableBoardBounds,
	start: Coordinate | undefined,
	end: Coordinate | undefined,
) => {
	includePoint(bounds, start);
	includePoint(bounds, end);
};

const includeRect = (
	bounds: MutableBoardBounds,
	start: Coordinate | undefined,
	end: Coordinate | undefined,
) => {
	if (!start || !end) return;
	includePoint(bounds, start);
	includePoint(bounds, { x: start.x, y: end.y });
	includePoint(bounds, end);
	includePoint(bounds, { x: end.x, y: start.y });
};

const includeCircle = (
	bounds: MutableBoardBounds,
	center: Coordinate | undefined,
	end: Coordinate | undefined,
) => {
	if (!center || !end) return;
	const radius = distance(center, end);

	includePoint(bounds, { x: center.x - radius, y: center.y });
	includePoint(bounds, { x: center.x + radius, y: center.y });
	includePoint(bounds, { x: center.x, y: center.y - radius });
	includePoint(bounds, { x: center.x, y: center.y + radius });
};

const includeArc = (
	bounds: MutableBoardBounds,
	start: Coordinate | undefined,
	mid: Coordinate | undefined,
	end: Coordinate | undefined,
) => {
	if (!start || !mid || !end) return;

	const circle = circleFromThreePoints(start, mid, end);
	if (!circle) {
		includePoint(bounds, start);
		includePoint(bounds, mid);
		includePoint(bounds, end);
		return;
	}

	includePoint(bounds, start);
	includePoint(bounds, mid);
	includePoint(bounds, end);

	const startAngle = angleOf(circle.center, start);
	const midAngle = angleOf(circle.center, mid);
	const endAngle = angleOf(circle.center, end);
	const direction = isAngleBetweenClockwise(midAngle, startAngle, endAngle)
		? "clockwise"
		: "counterclockwise";

	for (const angle of CARDINAL_ANGLES) {
		const isOnArc =
			direction === "clockwise"
				? isAngleBetweenClockwise(angle, startAngle, endAngle)
				: isAngleBetweenCounterClockwise(angle, startAngle, endAngle);

		if (isOnArc) {
			includePoint(bounds, {
				x: circle.center.x + circle.radius * Math.cos(angle),
				y: circle.center.y + circle.radius * Math.sin(angle),
			});
		}
	}
};

const includePoly = (bounds: MutableBoardBounds, poly: GrPoly) => {
	includePts(bounds, poly.points, identityTransform);
};

const includeFootprintLine = (
	bounds: MutableBoardBounds,
	line: FpLine,
	transform: PointTransform,
) => {
	includeLine(
		bounds,
		transformOptional(line.start),
		transformOptional(line.end),
	);

	function transformOptional(point: Coordinate | undefined) {
		return point ? transform(point) : undefined;
	}
};

const includeFootprintRect = (
	bounds: MutableBoardBounds,
	rect: FpRect,
	transform: PointTransform,
) => {
	if (!rect.start || !rect.end) return;

	includePoint(bounds, transform(rect.start));
	includePoint(bounds, transform({ x: rect.start.x, y: rect.end.y }));
	includePoint(bounds, transform(rect.end));
	includePoint(bounds, transform({ x: rect.end.x, y: rect.start.y }));
};

const includeFootprintCircle = (
	bounds: MutableBoardBounds,
	circle: FpCircle,
	transform: PointTransform,
) => {
	if (!circle.center || !circle.end) return;
	includeCircle(bounds, transform(circle.center), transform(circle.end));
};

const includeFootprintArc = (
	bounds: MutableBoardBounds,
	arc: FpArc,
	transform: PointTransform,
) => {
	includeArc(
		bounds,
		arc.start ? transform(arc.start) : undefined,
		arc.mid ? transform(arc.mid) : undefined,
		arc.end ? transform(arc.end) : undefined,
	);
};

const includeFootprintPoly = (
	bounds: MutableBoardBounds,
	poly: FpPoly,
	transform: PointTransform,
) => {
	includePts(bounds, poly.points, transform);
};

const includePts = (
	bounds: MutableBoardBounds,
	pts: GrPoly["points"] | FpPoly["points"],
	transform: PointTransform,
) => {
	if (!pts) return;

	for (const point of pts.points) {
		if (point instanceof PtsArc) {
			includeArc(
				bounds,
				point.start ? transform(point.start) : undefined,
				point.mid ? transform(point.mid) : undefined,
				point.end ? transform(point.end) : undefined,
			);
			continue;
		}

		includePoint(bounds, transform(point));
	}
};

const includeCurve = (
	bounds: MutableBoardBounds,
	curve: GrCurve | FpCurve,
	transform: PointTransform,
) => {
	const pts = curve.points?.points;
	if (!pts) return;

	// A KiCad curve is a cubic Bézier (four control points). Transform the
	// control points into board coordinates first, then take the exact extrema
	// there — the footprint transform is affine, so this yields the correct
	// axis-aligned bounds.
	const controlPoints: Coordinate[] = [];
	for (const point of pts) {
		if (point instanceof PtsArc) {
			includeArc(
				bounds,
				point.start ? transform(point.start) : undefined,
				point.mid ? transform(point.mid) : undefined,
				point.end ? transform(point.end) : undefined,
			);
			continue;
		}

		controlPoints.push(transform(point));
	}

	for (const point of cubicBezierBoundsPoints(controlPoints)) {
		includePoint(bounds, point);
	}
};

const getFootprintTransform = (footprint: Footprint): PointTransform => {
	const position = footprint.position;
	if (!position) return identityTransform;

	const offset = { x: position.x, y: position.y };
	const angle = position instanceof At ? (position.angle ?? 0) : 0;

	if (Math.abs(angle) < GEOMETRY_EPSILON) {
		return (point) => ({ x: point.x + offset.x, y: point.y + offset.y });
	}

	const radians = degreesToRadians(angle);
	const cos = Math.cos(radians);
	const sin = Math.sin(radians);

	return (point) => ({
		x: offset.x + point.x * cos - point.y * sin,
		y: offset.y + point.x * sin + point.y * cos,
	});
};

const identityTransform = (point: Coordinate): Coordinate => ({
	x: point.x,
	y: point.y,
});

const distance = (a: Coordinate, b: Coordinate) =>
	Math.hypot(a.x - b.x, a.y - b.y);

const degreesToRadians = (degrees: number) => (degrees * Math.PI) / 180;

const angleOf = (center: Coordinate, point: Coordinate) =>
	normalizeAngle(Math.atan2(point.y - center.y, point.x - center.x));

const normalizeAngle = (angle: number) => {
	const normalized = angle % (2 * Math.PI);
	return normalized < 0 ? normalized + 2 * Math.PI : normalized;
};

const clockwiseDistance = (from: number, to: number) =>
	normalizeAngle(from - to);

const counterClockwiseDistance = (from: number, to: number) =>
	normalizeAngle(to - from);

const isAngleBetweenClockwise = (angle: number, start: number, end: number) =>
	clockwiseDistance(start, angle) <= clockwiseDistance(start, end);

const isAngleBetweenCounterClockwise = (
	angle: number,
	start: number,
	end: number,
) =>
	counterClockwiseDistance(start, angle) <=
	counterClockwiseDistance(start, end);

const circleFromThreePoints = (
	a: Coordinate,
	b: Coordinate,
	c: Coordinate,
):
	| {
			readonly center: Coordinate;
			readonly radius: number;
	  }
	| undefined => {
	const determinant =
		2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));

	if (Math.abs(determinant) < GEOMETRY_EPSILON) {
		return undefined;
	}

	const aSquared = a.x ** 2 + a.y ** 2;
	const bSquared = b.x ** 2 + b.y ** 2;
	const cSquared = c.x ** 2 + c.y ** 2;

	const center = {
		x:
			(aSquared * (b.y - c.y) +
				bSquared * (c.y - a.y) +
				cSquared * (a.y - b.y)) /
			determinant,
		y:
			(aSquared * (c.x - b.x) +
				bSquared * (a.x - c.x) +
				cSquared * (b.x - a.x)) /
			determinant,
	};

	return {
		center,
		radius: distance(center, a),
	};
};
