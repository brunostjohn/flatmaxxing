import { expect, test } from "bun:test";
import DxfParser, { type IDxf } from "dxf-parser";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getDxfBounds } from "./geometry";

const makeDxf = (entities: unknown[]): IDxf => ({ entities }) as IDxf;

test("gets bounds from a generated KiCad paste DXF", () => {
	const parser = new DxfParser();
	const dxf = parser.parseSync(
		readFileSync(
			resolve(process.cwd(), "testdir/dxf/valid_board-F_Paste.dxf"),
			"utf8",
		),
	);

	if (!dxf) {
		throw new Error("Failed to parse DXF fixture");
	}

	expect(getDxfBounds(dxf)).toEqual({ width: 42.5, height: 25 });
});

test("uses the actual arc span instead of the full circle", () => {
	const bounds = getDxfBounds(
		makeDxf([
			{
				type: "ARC",
				center: { x: 0, y: 0, z: 0 },
				radius: 10,
				startAngle: 0,
				endAngle: Math.PI / 2,
			},
		]),
	);

	expect(bounds.width).toBeCloseTo(10);
	expect(bounds.height).toBeCloseTo(10);
});

test("handles full ellipse bounds", () => {
	const bounds = getDxfBounds(
		makeDxf([
			{
				type: "ELLIPSE",
				center: { x: 0, y: 0, z: 0 },
				majorAxisEndPoint: { x: 5, y: 0, z: 0 },
				axisRatio: 0.5,
				startAngle: 0,
				endAngle: Math.PI * 2,
			},
		]),
	);

	expect(bounds.width).toBeCloseTo(10);
	expect(bounds.height).toBeCloseTo(5);
});
