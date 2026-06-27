import { expect, test } from "bun:test";
import { parseExcellon } from "./parseExcellon";
import { renderExcellon } from "./renderExcellon";
import type { Hole } from "./types";

test("renders a valid metric Excellon with one tool per distinct size", () => {
  const holes: Hole[] = [
    { kind: "circle", plating: "PTH", diameter: 0.5, x: 1, y: 2, tool: 1 },
    { kind: "circle", plating: "PTH", diameter: 0.5, x: 3, y: 4, tool: 1 },
    { kind: "circle", plating: "PTH", diameter: 1.2, x: 5, y: 6, tool: 2 },
  ];
  const drl = renderExcellon(holes);
  expect(drl).toContain("M48");
  expect(drl).toContain("METRIC");
  expect(drl).toContain("T1C0.5000");
  expect(drl).toContain("T2C1.2000");
  expect(drl.trimEnd().endsWith("M30")).toBe(true);
});

test("round-trips circles and routed slots through the parser", () => {
  const original: Hole[] = [
    {
      kind: "circle",
      plating: "NPTH",
      diameter: 0.65,
      x: 19.295,
      y: 5.983,
      tool: 1,
    },
    {
      kind: "slot",
      plating: "PTH",
      width: 0.6,
      path: [
        { x: 17.865, y: 7.053 },
        { x: 17.865, y: 5.953 },
      ],
      length: 1.7,
      tool: 2,
    },
  ];

  const reparsed = parseExcellon(renderExcellon(original)).holes;

  const circle = reparsed.find((h) => h.kind === "circle");
  expect(circle).toMatchObject({
    plating: "NPTH",
    diameter: 0.65,
    x: 19.295,
    y: 5.983,
  });

  const slot = reparsed.find((h) => h.kind === "slot");
  expect(slot).toBeDefined();
  if (slot?.kind === "slot") {
    expect(slot.width).toBe(0.6);
    expect(slot.path).toHaveLength(2);
    expect(slot.length).toBeCloseTo(1.7, 6);
  }
});

test("re-emits PTH/NPTH plating comments for traceability", () => {
  const drl = renderExcellon([
    { kind: "circle", plating: "NPTH", diameter: 0.65, x: 0, y: 0, tool: 1 },
  ]);
  expect(drl).toContain("NonPlated,NPTH");
});
