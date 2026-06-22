import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseKicadPcb } from "kicadts";
import {
	collectEdgeCutsPrimitives,
	kicadToGerberTransform,
	MissingAuxAxisOriginError,
	transformOutline,
} from "./extractEdgeCutsOutline";

const makeBoard = (body: string) => `
(kicad_pcb
  (version 20221018)
  (generator flatmaxx-test)
  (layers (44 "Edge.Cuts" user))
  ${body}
)
`;

test("kicadToGerberTransform maps a point via gx=x-auxX, gy=auxY-y", () => {
	const pcb = parseKicadPcb(
		makeBoard(`(setup (aux_axis_origin 104.065444 82.878393))`),
	);
	const t = kicadToGerberTransform(pcb);

	// The aux origin itself maps to (0, 0).
	const origin = t({ x: 104.065444, y: 82.878393 });
	expect(origin.x).toBeCloseTo(0, 6);
	expect(origin.y).toBeCloseTo(0, 6);

	// A point 10mm right and 5mm "up" (smaller KiCad Y) of the origin.
	const p = t({ x: 114.065444, y: 77.878393 });
	expect(p.x).toBeCloseTo(10, 6);
	expect(p.y).toBeCloseTo(5, 6); // auxY - y = 82.878393 - 77.878393
});

test("kicadToGerberTransform THROWS when aux_axis_origin is absent", () => {
	const pcb = parseKicadPcb(makeBoard(`(setup)`));
	expect(() => kicadToGerberTransform(pcb)).toThrow(MissingAuxAxisOriginError);
});

test("the Y-flip transform inverts arc winding", () => {
	// A board outlined by a single CCW arc-pair (a circle split into two arcs).
	const pcb = parseKicadPcb(
		makeBoard(`
      (setup (aux_axis_origin 0 0))
      (gr_arc (start 10 0) (mid 0 10) (end -10 0) (stroke (width 0.2) (type default)) (layer "Edge.Cuts"))
      (gr_arc (start -10 0) (mid 0 -10) (end 10 0) (stroke (width 0.2) (type default)) (layer "Edge.Cuts"))
    `),
	);

	const outline = collectEdgeCutsPrimitives(pcb);
	const rawArcs = outline.cmds.filter((c) => c.kind === "arc");
	expect(rawArcs).toHaveLength(2);

	const flipped = transformOutline(outline, kicadToGerberTransform(pcb));
	const flippedArcs = flipped.cmds.filter(
		(c): c is Extract<(typeof flipped.cmds)[number], { kind: "arc" }> =>
			c.kind === "arc",
	);

	// Each arc's winding is inverted by the orientation-reversing Y-flip.
	for (let i = 0; i < rawArcs.length; i++) {
		const raw = rawArcs[i]!;
		if (raw.kind !== "arc") continue;
		expect(flippedArcs[i]!.cw).toBe(!raw.cw);
	}
});

test("a footprint-level edge cut chains into the outline with its transform", () => {
	// A rectangle drawn as four fp_lines inside a footprint translated to (5,5).
	const pcb = parseKicadPcb(
		makeBoard(`
      (setup (aux_axis_origin 0 0))
      (footprint "frame" (layer "F.Cu") (at 5 5)
        (fp_line (start 0 0) (end 10 0) (stroke (width 0.2) (type default)) (layer "Edge.Cuts"))
        (fp_line (start 10 0) (end 10 8) (stroke (width 0.2) (type default)) (layer "Edge.Cuts"))
        (fp_line (start 10 8) (end 0 8) (stroke (width 0.2) (type default)) (layer "Edge.Cuts"))
        (fp_line (start 0 8) (end 0 0) (stroke (width 0.2) (type default)) (layer "Edge.Cuts"))
      )
    `),
	);

	const outline = collectEdgeCutsPrimitives(pcb);
	expect(outline.cmds).toHaveLength(4);
	// Translated by (5,5): the rect spans [5,15] x [5,13].
	const xs = [outline.start.x, ...outline.cmds.map((c) => c.to.x)];
	const ys = [outline.start.y, ...outline.cmds.map((c) => c.to.y)];
	expect(Math.min(...xs)).toBeCloseTo(5);
	expect(Math.max(...xs)).toBeCloseTo(15);
	expect(Math.min(...ys)).toBeCloseTo(5);
	expect(Math.max(...ys)).toBeCloseTo(13);
});

test("the real zefir Edge.Cuts closes into a single loop matching the golden start", () => {
	const src = readFileSync(
		resolve(process.cwd(), "testdir/new-and-improved-zefir-btn.kicad_pcb"),
		"utf8",
	);
	const pcb = parseKicadPcb(src);

	const outline = collectEdgeCutsPrimitives(pcb);

	// 3 arcs + 3 flattened curves -> one closed loop. The tiny aux-origin
	// gr_circle is excluded, so it never breaks the chain.
	const arcs = outline.cmds.filter((c) => c.kind === "arc");
	expect(arcs).toHaveLength(3);
	expect(outline.cmds.length).toBeGreaterThan(arcs.length); // curves flattened

	// Loop is closed: last command returns to the start point.
	const last = outline.cmds.at(-1)!;
	expect(last.to.x).toBeCloseTo(outline.start.x, 6);
	expect(last.to.y).toBeCloseTo(outline.start.y, 6);

	// Transformed, the start matches the golden Gerber's first D02 (1.184556,
	// 14.878393 mm). The first arc is clockwise (golden emits G02).
	const transformed = transformOutline(outline, kicadToGerberTransform(pcb));
	expect(transformed.start.x).toBeCloseTo(1.184556, 4);
	expect(transformed.start.y).toBeCloseTo(14.878393, 4);
	const firstArc = transformed.cmds.find((c) => c.kind === "arc")!;
	expect(firstArc.kind).toBe("arc");
	if (firstArc.kind === "arc") expect(firstArc.cw).toBe(true);
});
