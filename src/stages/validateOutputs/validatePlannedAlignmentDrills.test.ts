import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderPlannedAlignmentDrillFile } from "./validatePlannedAlignmentDrills";

test("renders planned alignment drill Excellon from board Edge.Cuts", () => {
  const source = readFileSync(
    resolve(process.cwd(), "testdir/valid_board.kicad_pcb"),
    "utf8",
  );

  const rendered = renderPlannedAlignmentDrillFile(source, {
    enabled: true,
    gerbersDir: "unused",
    distance: { x: 6, y: 6 },
    diameter: 2,
  });

  expect(rendered).toContain("M48");
  expect(rendered).toContain("T1C2.0000");
  expect(rendered.match(/^X.*Y.*$/gm)).toHaveLength(4);
  expect(rendered.trimEnd().endsWith("M30")).toBe(true);
});
