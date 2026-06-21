import { expect, test } from "bun:test";
import {
	categorizeHoles,
	renderRoundedUpReport,
	resolveHoleTool,
	type ToolInventory,
} from "./categorizeHoles";
import type { CircleHole, Hole, SlotHole } from "./parseExcellon";

// Default-ish bench inventory.
const inv: ToolInventory = {
	drills: [0.3, 0.4, 0.5, 0.7, 0.8, 1.0, 1.1, 1.2].map((diameter) => ({
		diameter,
	})),
	mills: [0.7, 0.8, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5].map((diameter) => ({
		diameter,
	})),
	toleranceMm: 0.05,
};

const circle = (
	diameter: number,
	plating: CircleHole["plating"] = "PTH",
	x = 0,
	y = 0,
): CircleHole => ({
	kind: "circle",
	plating,
	diameter,
	x,
	y,
	tool: 1,
});

const slot = (
	width: number,
	length: number,
	plating: SlotHole["plating"] = "PTH",
): SlotHole => ({
	kind: "slot",
	plating,
	width,
	path: [
		{ x: 0, y: 0 },
		{ x: 0, y: length - width },
	],
	length,
	tool: 1,
});

test("exact drill match is not flagged as rounded up", () => {
	const r = resolveHoleTool(circle(0.5), inv);
	expect(r).toMatchObject({
		ok: true,
		method: "drill",
		toolDiameter: 0.5,
		roundedUp: false,
	});
});

test("round-up: 0.65 hole takes the 0.7 bit within tolerance", () => {
	const r = resolveHoleTool(circle(0.65), inv);
	expect(r).toMatchObject({
		ok: true,
		method: "drill",
		toolDiameter: 0.7,
		roundedUp: true,
	});
});

test("no in-band drill falls back to the largest cornmill that fits", () => {
	// 0.9: no drill in [0.9, 0.95]; largest mill ≤ 0.9 is 0.8.
	const r = resolveHoleTool(circle(0.9), inv);
	expect(r).toMatchObject({ ok: true, method: "pocket", toolDiameter: 0.8 });
});

test("a hole too small for any drill or mill is unmachinable", () => {
	// 0.6: 0.7 bit is 0.1 over (> tol); smallest mill 0.7 won't fit.
	const r = resolveHoleTool(circle(0.6), inv);
	expect(r.ok).toBe(false);
});

test("slots are always pocketed by the largest cornmill that fits", () => {
	expect(resolveHoleTool(slot(1.0, 2.0), inv)).toMatchObject({
		ok: true,
		method: "pocket",
		toolDiameter: 1.0,
	});
});

test("a slot narrower than the smallest cornmill is unmachinable", () => {
	expect(resolveHoleTool(slot(0.6, 1.7), inv).ok).toBe(false);
});

test("categorizeHoles buckets by category × method × tool, surfacing round-ups & failures", () => {
	const holes: Hole[] = [
		circle(0.4, "PTH", 1, 1),
		circle(0.4, "PTH", 2, 2),
		circle(0.65, "NPTH", 19.295, 5.983),
		slot(0.6, 1.7, "PTH"),
		slot(0.6, 1.4, "PTH"),
	];
	const { groups, unmachinable, roundUps } = categorizeHoles(holes, inv);

	const suffixes = groups.map((g) => g.fileSuffix);
	expect(suffixes).toContain("PTH-drills-0.4mm");
	expect(suffixes).toContain("NPTH-drills-0.7mm");

	const pth04 = groups.find((g) => g.fileSuffix === "PTH-drills-0.4mm")!;
	expect(pth04.holes).toHaveLength(2);

	// Both 0.6 slots can't be made with these mills.
	expect(unmachinable).toHaveLength(2);

	// The 0.65 → 0.7 round-up is recorded.
	expect(roundUps).toHaveLength(1);
	expect(roundUps[0]).toMatchObject({
		category: "NPTH",
		trueDiameter: 0.65,
		bitDiameter: 0.7,
	});
	expect(roundUps[0]!.delta).toBeCloseTo(0.05, 6);
});

test("categoryOverride groups everything under one label (alignment)", () => {
	// 2mm registration hole, no drill ≥ 2 — pocketed with the largest mill (1.5).
	const { groups } = categorizeHoles([circle(2.0)], inv, {
		categoryOverride: "alignment",
	});
	expect(groups).toHaveLength(1);
	expect(groups[0]!.fileSuffix).toBe("alignment-pockets-1.5mm");
});

test("unknown plating is treated as PTH for the filename category", () => {
	const { groups } = categorizeHoles([circle(0.5, "unknown")], inv);
	expect(groups[0]!.fileSuffix).toBe("PTH-drills-0.5mm");
});

test("renderRoundedUpReport lists each oversize hole with its delta", () => {
	const report = renderRoundedUpReport("zefir", [
		{
			category: "NPTH",
			plating: "NPTH",
			x: 19.295,
			y: 5.983,
			trueDiameter: 0.65,
			bitDiameter: 0.7,
			delta: 0.05,
		},
	]);
	expect(report).toContain("ROUNDED UP for zefir");
	expect(report).toContain(
		"0.65mm NPTH @ (19.295, 5.983) → drilled 0.7mm (+0.05)",
	);
});
