import type { Coordinate, PathCmd } from "@/geometry/gerberWriter";
import { expect, test } from "bun:test";
import { buildPlatingRoundedRect } from "./platingOutline";

const noOffsets = { left: 0, right: 0, top: 0, bottom: 0 };

const allPoints = (
	start: Coordinate,
	cmds: readonly PathCmd[],
): Coordinate[] => [start, ...cmds.map((c) => c.to)];

const boundsOf = (points: readonly Coordinate[]) => ({
	minX: Math.min(...points.map((p) => p.x)),
	minY: Math.min(...points.map((p) => p.y)),
	maxX: Math.max(...points.map((p) => p.x)),
	maxY: Math.max(...points.map((p) => p.y)),
});

test("a zero-radius rounded rect is a plain rectangle that fits the bounds", () => {
	const { start, cmds } = buildPlatingRoundedRect(
		{ minX: 0, minY: 0, maxX: 10, maxY: 6 },
		[],
		noOffsets,
		0,
	);
	expect(cmds.every((c) => c.kind === "line")).toBe(true);
	const b = boundsOf(allPoints(start, cmds));
	expect(b).toEqual({ minX: 0, minY: 0, maxX: 10, maxY: 6 });
});

test("a rounded rect emits 4 lines + 4 arcs with correct corner coordinates", () => {
	const radius = 2;
	const { start, cmds } = buildPlatingRoundedRect(
		{ minX: 0, minY: 0, maxX: 10, maxY: 8 },
		[],
		noOffsets,
		radius,
	);

	expect(cmds.filter((c) => c.kind === "line")).toHaveLength(4);
	expect(cmds.filter((c) => c.kind === "arc")).toHaveLength(4);

	// Outer boundary traced CCW in board frame -> arcs are CCW (cw=false).
	for (const cmd of cmds) {
		if (cmd.kind === "arc") expect(cmd.cw).toBe(false);
	}

	// Start sits on the bottom edge, radius past the bottom-left corner.
	expect(start).toEqual({ x: radius, y: 0 });

	// The four arcs round the four corners; each arc centre is inset by radius.
	const arcCenters = cmds
		.filter((c): c is Extract<PathCmd, { kind: "arc" }> => c.kind === "arc")
		.map((c) => c.center);
	expect(arcCenters).toEqual([
		{ x: 10 - radius, y: radius }, // bottom-right
		{ x: 10 - radius, y: 8 - radius }, // top-right
		{ x: radius, y: 8 - radius }, // top-left
		{ x: radius, y: radius }, // bottom-left
	]);

	// The outline still spans the full bounds.
	const b = boundsOf(allPoints(start, cmds));
	expect(b).toEqual({ minX: 0, minY: 0, maxX: 10, maxY: 8 });
});

test("the corner radius is clamped to half the shorter side", () => {
	// Shorter side is height = 6 -> max radius 3, even though 100 was requested.
	const { start, cmds } = buildPlatingRoundedRect(
		{ minX: 0, minY: 0, maxX: 20, maxY: 6 },
		[],
		noOffsets,
		100,
	);
	const arc = cmds.find(
		(c): c is Extract<PathCmd, { kind: "arc" }> => c.kind === "arc",
	)!;
	// Bottom-right arc centre y == radius; clamped radius is 3.
	expect(arc.center.y).toBeCloseTo(3);
	expect(start.x).toBeCloseTo(3); // start = minX + radius
});

test("asymmetric offsets expand each side independently", () => {
	const { start, cmds } = buildPlatingRoundedRect(
		{ minX: 0, minY: 0, maxX: 10, maxY: 10 },
		[],
		{ left: 1, right: 2, top: 3, bottom: 4 },
		0,
	);
	const b = boundsOf(allPoints(start, cmds));
	expect(b.minX).toBe(-1); // left
	expect(b.maxX).toBe(12); // right
	expect(b.minY).toBe(-3); // top (smaller Y)
	expect(b.maxY).toBe(14); // bottom (larger Y)
});

test("the rect is unioned with alignment points outside the board bounds", () => {
	// Alignment corners sit 5mm beyond each board corner.
	const alignment: Coordinate[] = [
		{ x: -5, y: -5 },
		{ x: 15, y: -5 },
		{ x: -5, y: 15 },
		{ x: 15, y: 15 },
	];
	const { start, cmds } = buildPlatingRoundedRect(
		{ minX: 0, minY: 0, maxX: 10, maxY: 10 },
		alignment,
		noOffsets,
		0,
	);
	const b = boundsOf(allPoints(start, cmds));
	// Every alignment point must be enclosed.
	expect(b.minX).toBeLessThanOrEqual(-5);
	expect(b.minY).toBeLessThanOrEqual(-5);
	expect(b.maxX).toBeGreaterThanOrEqual(15);
	expect(b.maxY).toBeGreaterThanOrEqual(15);
});
