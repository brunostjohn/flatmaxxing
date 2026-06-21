import { expect, test } from "bun:test";
import {
	cubicBezierBoundsPoints,
	cubicBezierExtrema,
	type Point,
} from "./cubicBezierBounds";

const boundsOf = (points: ReadonlyArray<Point>) => {
	const xs = points.map((p) => p.x);
	const ys = points.map((p) => p.y);
	return {
		minX: Math.min(...xs),
		maxX: Math.max(...xs),
		minY: Math.min(...ys),
		maxY: Math.max(...ys),
	};
};

test("symmetric arch has an interior maximum at t=0.5", () => {
	// P0(0,0) P1(0,10) P2(10,10) P3(10,0): peak y = 7.5 at t=0.5, x spans [0,10].
	const points = cubicBezierExtrema(
		{ x: 0, y: 0 },
		{ x: 0, y: 10 },
		{ x: 10, y: 10 },
		{ x: 10, y: 0 },
	);
	const bounds = boundsOf(points);

	expect(bounds.minX).toBeCloseTo(0);
	expect(bounds.maxX).toBeCloseTo(10);
	expect(bounds.minY).toBeCloseTo(0);
	expect(bounds.maxY).toBeCloseTo(7.5);
});

test("monotonic curve is bounded by its endpoints only", () => {
	// Strictly increasing controls -> no interior extremum.
	const points = cubicBezierExtrema(
		{ x: 0, y: 0 },
		{ x: 1, y: 2 },
		{ x: 2, y: 4 },
		{ x: 3, y: 6 },
	);
	const bounds = boundsOf(points);

	expect(bounds.minX).toBeCloseTo(0);
	expect(bounds.maxX).toBeCloseTo(3);
	expect(bounds.minY).toBeCloseTo(0);
	expect(bounds.maxY).toBeCloseTo(6);
});

test("collinear control points produce no spurious interior extrema", () => {
	const points = cubicBezierExtrema(
		{ x: 0, y: 0 },
		{ x: 1, y: 1 },
		{ x: 2, y: 2 },
		{ x: 3, y: 3 },
	);
	const bounds = boundsOf(points);

	expect(bounds.minX).toBeCloseTo(0);
	expect(bounds.maxX).toBeCloseTo(3);
	expect(bounds.minY).toBeCloseTo(0);
	expect(bounds.maxY).toBeCloseTo(3);
});

test("non-cubic point counts fall back to the convex hull of controls", () => {
	const controls: Point[] = [
		{ x: 0, y: 0 },
		{ x: 5, y: 10 },
		{ x: 10, y: -2 },
	];

	expect(cubicBezierBoundsPoints(controls)).toEqual(controls);
});

test("cubicBezierBoundsPoints uses exact extrema for four points", () => {
	const bounds = boundsOf(
		cubicBezierBoundsPoints([
			{ x: 0, y: 0 },
			{ x: 0, y: 10 },
			{ x: 10, y: 10 },
			{ x: 10, y: 0 },
		]),
	);

	expect(bounds.maxY).toBeCloseTo(7.5);
	expect(bounds.maxX).toBeCloseTo(10);
});
