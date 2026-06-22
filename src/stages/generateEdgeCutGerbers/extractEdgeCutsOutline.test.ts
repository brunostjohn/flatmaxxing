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

	const origin = t({ x: 104.065444, y: 82.878393 });
	expect(origin.x).toBeCloseTo(0, 6);
	expect(origin.y).toBeCloseTo(0, 6);

	const p = t({ x: 114.065444, y: 77.878393 });
	expect(p.x).toBeCloseTo(10, 6);
	expect(p.y).toBeCloseTo(5, 6);
});

test("kicadToGerberTransform THROWS when aux_axis_origin is absent", () => {
	const pcb = parseKicadPcb(makeBoard(`(setup)`));
	expect(() => kicadToGerberTransform(pcb)).toThrow(MissingAuxAxisOriginError);
});

test("the Y-flip transform inverts arc winding", () => {
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

	for (let i = 0; i < rawArcs.length; i++) {
		const raw = rawArcs[i]!;
		if (raw.kind !== "arc") continue;
		expect(flippedArcs[i]!.cw).toBe(!raw.cw);
	}
});

test("a footprint-level edge cut chains into the outline with its transform", () => {
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

	const arcs = outline.cmds.filter((c) => c.kind === "arc");
	expect(arcs).toHaveLength(3);
	expect(outline.cmds.length).toBeGreaterThan(arcs.length);

	const last = outline.cmds.at(-1)!;
	expect(last.to.x).toBeCloseTo(outline.start.x, 6);
	expect(last.to.y).toBeCloseTo(outline.start.y, 6);

	const transformed = transformOutline(outline, kicadToGerberTransform(pcb));
	expect(transformed.start.x).toBeCloseTo(1.184556, 4);
	expect(transformed.start.y).toBeCloseTo(14.878393, 4);
	const firstArc = transformed.cmds.find((c) => c.kind === "arc")!;
	expect(firstArc.kind).toBe("arc");
	if (firstArc.kind === "arc") expect(firstArc.cw).toBe(true);
});
