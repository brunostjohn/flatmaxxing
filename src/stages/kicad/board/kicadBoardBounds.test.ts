import {
  findEdgeCutsBounds,
  getBottomLeftBoardOrigin,
} from "@/stages/kicad/board/kicadBoardBounds";
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseKicadPcb } from "kicadts";

const makeBoard = (edgeCutsBody: string) => `
(kicad_pcb
  (version 20221018)
  (generator flatmaxx-test)
  (layers
    (0 "F.Cu" signal)
    (31 "B.Cu" signal)
    (44 "Edge.Cuts" user)
  )
  ${edgeCutsBody}
)
`;

test("gr_curve Edge.Cuts bounds use the exact cubic Bézier extrema", () => {
  // Symmetric arch: peak y = 7.5 at t=0.5, x spans [0, 10].
  const pcb = parseKicadPcb(
    makeBoard(
      `(gr_curve
        (pts (xy 0 0) (xy 0 10) (xy 10 10) (xy 10 0))
        (stroke (width 0.2) (type default))
        (layer "Edge.Cuts")
      )`,
    ),
  );

  const bounds = findEdgeCutsBounds(pcb);

  expect(bounds.minX).toBeCloseTo(0);
  expect(bounds.maxX).toBeCloseTo(10);
  expect(bounds.minY).toBeCloseTo(0);
  expect(bounds.maxY).toBeCloseTo(7.5);
});

test("a curve-only board no longer throws when inferring the origin", () => {
  const pcb = parseKicadPcb(
    makeBoard(
      `(gr_curve
        (pts (xy 0 0) (xy 0 10) (xy 10 10) (xy 10 0))
        (stroke (width 0.2) (type default))
        (layer "Edge.Cuts")
      )`,
    ),
  );

  const origin = getBottomLeftBoardOrigin(pcb);

  expect(origin.x).toBeCloseTo(0);
  expect(origin.y).toBeCloseTo(7.5);
});

test("fp_curve bounds apply the footprint transform to the control points", () => {
  // A curve along the x-axis, inside a footprint rotated 90° and translated to
  // (5, 5), must become a curve along the y-axis: x collapses to 5, y spans
  // [5, 15]. This only holds if the transform is applied to the control points.
  const pcb = parseKicadPcb(
    makeBoard(
      `(footprint "test"
        (layer "F.Cu")
        (at 5 5 90)
        (fp_curve
          (pts (xy 0 0) (xy 3 0) (xy 7 0) (xy 10 0))
          (stroke (width 0.2) (type default))
          (layer "Edge.Cuts")
        )
      )`,
    ),
  );

  const bounds = findEdgeCutsBounds(pcb);

  expect(bounds.minX).toBeCloseTo(5);
  expect(bounds.maxX).toBeCloseTo(5);
  expect(bounds.minY).toBeCloseTo(5);
  expect(bounds.maxY).toBeCloseTo(15);
});

test("the real curved board outline yields a finite origin without throwing", () => {
  const source = readFileSync(
    resolve(process.cwd(), "testdir/new-and-improved-zefir-btn.kicad_pcb"),
    "utf8",
  );
  const pcb = parseKicadPcb(source);

  const bounds = findEdgeCutsBounds(pcb);
  const origin = getBottomLeftBoardOrigin(pcb);

  // The board has gr_arc, gr_curve and gr_circle on Edge.Cuts; previously the
  // gr_curve made this throw. The outline is ~44 mm × 43.6 mm.
  expect(bounds.maxX - bounds.minX).toBeCloseTo(44, 1);
  expect(bounds.maxY - bounds.minY).toBeCloseTo(43.59, 1);
  expect(origin.x).toBeCloseTo(104.07, 1);
  expect(origin.y).toBeCloseTo(82.88, 1);
});
