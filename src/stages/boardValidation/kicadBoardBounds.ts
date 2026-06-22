import { cubicBezierBoundsPoints } from "@/geometry/cubicBezierBounds";
import { BoardValidationError } from "@/stages/boardValidation/boardValidationTypes";
import {
	collectEdgeCutPrimitives,
	type Coordinate,
	type EdgeCutPrimitive,
} from "@/stages/boardValidation/edgeCutsTraversal";
import type { KicadPcb } from "kicadts";

export type { Coordinate } from "@/stages/boardValidation/edgeCutsTraversal";

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

const CARDINAL_ANGLES = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2] as const;
const GEOMETRY_EPSILON = 1e-9;

export const getBottomLeftBoardOrigin = (pcb: KicadPcb): Coordinate => {
	const bounds = findEdgeCutsBounds(pcb);
	return { x: bounds.minX, y: bounds.maxY };
};

export const findEdgeCutsBounds = (pcb: KicadPcb): BoardBounds => {
	const bounds = createEmptyBounds();

	for (const primitive of collectEdgeCutPrimitives(pcb)) {
		includePrimitive(bounds, primitive);
	}

	if (!hasBounds(bounds)) {
		throw new BoardValidationError(
			"No Edge.Cuts geometry was found, so the board origin cannot be inferred.",
		);
	}

	return bounds;
};

const includePrimitive = (
	bounds: MutableBoardBounds,
	primitive: EdgeCutPrimitive,
): void => {
	switch (primitive.kind) {
		case "segment":
			includePoint(bounds, primitive.start);
			includePoint(bounds, primitive.end);
			return;
		case "arc":
			includeArc(bounds, primitive.start, primitive.mid, primitive.end);
			return;
		case "circle":
			includeCircle(bounds, primitive.center, primitive.edge);
			return;
		case "rect":
			includeRect(bounds, primitive.start, primitive.end, primitive.transform);
			return;
		case "poly":
			for (const point of primitive.points) includePoint(bounds, point);
			return;
		case "curve":
			for (const point of cubicBezierBoundsPoints(primitive.controlPoints)) {
				includePoint(bounds, point);
			}
			return;
	}
};

const createEmptyBounds = (): MutableBoardBounds => ({
	minX: Number.POSITIVE_INFINITY,
	minY: Number.POSITIVE_INFINITY,
	maxX: Number.NEGATIVE_INFINITY,
	maxY: Number.NEGATIVE_INFINITY,
});

const hasBounds = (bounds: MutableBoardBounds): boolean =>
	Number.isFinite(bounds.minX) &&
	Number.isFinite(bounds.minY) &&
	Number.isFinite(bounds.maxX) &&
	Number.isFinite(bounds.maxY);

const includePoint = (
	bounds: MutableBoardBounds,
	point: Coordinate | undefined,
): void => {
	if (!point) return;
	bounds.minX = Math.min(bounds.minX, point.x);
	bounds.minY = Math.min(bounds.minY, point.y);
	bounds.maxX = Math.max(bounds.maxX, point.x);
	bounds.maxY = Math.max(bounds.maxY, point.y);
};

const includeRect = (
	bounds: MutableBoardBounds,
	start: Coordinate,
	end: Coordinate,
	transform: (point: Coordinate) => Coordinate,
): void => {
	includePoint(bounds, transform(start));
	includePoint(bounds, transform({ x: start.x, y: end.y }));
	includePoint(bounds, transform(end));
	includePoint(bounds, transform({ x: end.x, y: start.y }));
};

const includeCircle = (
	bounds: MutableBoardBounds,
	center: Coordinate,
	edge: Coordinate,
): void => {
	const radius = distance(center, edge);
	includePoint(bounds, { x: center.x - radius, y: center.y });
	includePoint(bounds, { x: center.x + radius, y: center.y });
	includePoint(bounds, { x: center.x, y: center.y - radius });
	includePoint(bounds, { x: center.x, y: center.y + radius });
};

const includeArc = (
	bounds: MutableBoardBounds,
	start: Coordinate,
	mid: Coordinate,
	end: Coordinate,
): void => {
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

const distance = (a: Coordinate, b: Coordinate): number =>
	Math.hypot(a.x - b.x, a.y - b.y);

/**
 * The signed angle (in `[0, 2π)`) of `point` as seen from `center`. Exported so
 * the Edge.Cuts outline extractor can reuse the exact same arc geometry the
 * bounds inference uses.
 */
export const angleOf = (center: Coordinate, point: Coordinate): number =>
	normalizeAngle(Math.atan2(point.y - center.y, point.x - center.x));

const normalizeAngle = (angle: number): number => {
	const normalized = angle % (2 * Math.PI);
	return normalized < 0 ? normalized + 2 * Math.PI : normalized;
};

const clockwiseDistance = (from: number, to: number): number =>
	normalizeAngle(from - to);

const counterClockwiseDistance = (from: number, to: number): number =>
	normalizeAngle(to - from);

/** True if `angle` is reached going clockwise from `start` before `end` is. */
export const isAngleBetweenClockwise = (
	angle: number,
	start: number,
	end: number,
): boolean => clockwiseDistance(start, angle) <= clockwiseDistance(start, end);

const isAngleBetweenCounterClockwise = (
	angle: number,
	start: number,
	end: number,
): boolean =>
	counterClockwiseDistance(start, angle) <=
	counterClockwiseDistance(start, end);

/**
 * The circle through three points, or `undefined` when they are collinear.
 * Exported for reuse by the Edge.Cuts outline extractor, which converts KiCad's
 * start/mid/end arcs into centre + winding for the Gerber writer.
 */
export const circleFromThreePoints = (
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
