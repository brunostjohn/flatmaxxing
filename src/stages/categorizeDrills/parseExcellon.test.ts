import { expect, test } from "bun:test";
import { parseExcellon } from "./parseExcellon";
import type { Hole } from "./types";

// Faithful trim of a KiCad 9 "MixedPlating" Excellon with the oval format set to
// `route` (G00/M15/G01/M16). Covers PTH vias, an NPTH component drill, and PTH
// routed slots (the USB-C oval pads) — the cases the categoriser must tell apart.
const FIXTURE = [
  "M48",
  "; DRILL file {KiCad 9.0.3}",
  "; FORMAT={-:-/ absolute / metric / decimal}",
  "; #@! TF.FileFunction,MixedPlating,1,2",
  "FMAT,2",
  "METRIC",
  "; #@! TA.AperFunction,Plated,PTH,ViaDrill",
  "T1C0.400",
  "; #@! TA.AperFunction,NonPlated,NPTH,ComponentDrill",
  "T5C0.650",
  "; #@! TA.AperFunction,Plated,PTH,ComponentDrill",
  "T3C0.600",
  "%",
  "G90",
  "G05",
  "T1",
  "X12.435Y24.878",
  "X16.302Y20.748",
  "T5",
  "X19.295Y5.983",
  "X25.075Y5.983",
  "T3",
  "G00X17.865Y7.053",
  "M15",
  "G01X17.865Y5.953",
  "M16",
  "G05",
  "G00X17.865Y2.703",
  "M15",
  "G01X17.865Y1.903",
  "M16",
  "G05",
  "M30",
].join("\n");

const circles = (holes: readonly Hole[]) =>
  holes.filter((h) => h.kind === "circle");
const slots = (holes: readonly Hole[]) =>
  holes.filter((h) => h.kind === "slot");

test("classifies circular drills with correct plating + diameter", () => {
  const { units, holes } = parseExcellon(FIXTURE);
  expect(units).toBe("metric");

  const round = circles(holes);
  expect(round).toHaveLength(4);

  const pthVias = round.filter((h) => h.diameter === 0.4);
  expect(pthVias).toHaveLength(2);
  expect(pthVias.every((h) => h.plating === "PTH")).toBe(true);

  const npth = round.filter((h) => h.diameter === 0.65);
  expect(npth).toHaveLength(2);
  expect(npth.every((h) => h.plating === "NPTH")).toBe(true);
  expect(npth[0]).toMatchObject({ x: 19.295, y: 5.983 });
});

test("classifies routed slots: width = tool Ø, length = path + width", () => {
  const { holes } = parseExcellon(FIXTURE);
  const slot = slots(holes);
  expect(slot).toHaveLength(2);

  for (const s of slot) {
    expect(s.kind).toBe("slot");
    if (s.kind !== "slot") continue;
    expect(s.width).toBe(0.6);
    expect(s.plating).toBe("PTH");
    expect(s.path).toHaveLength(2);
  }

  const lengths = slot
    .flatMap((s) => (s.kind === "slot" ? [s.length] : []))
    .sort((a, b) => a - b);
  // endpoints 0.8 apart + 0.6 width = 1.4; 1.1 apart + 0.6 = 1.7
  expect(lengths[0]).toBeCloseTo(1.4, 6);
  expect(lengths[1]).toBeCloseTo(1.7, 6);
});

test("does not mistake the G00 slot-start for a drilled hole", () => {
  // 4 real drills, 2 slots — the four G00 positioning moves must NOT become circles.
  const { holes } = parseExcellon(FIXTURE);
  expect(circles(holes)).toHaveLength(4);
  expect(slots(holes)).toHaveLength(2);
});

test("an empty drill file yields no holes", () => {
  const empty = ["M48", "FMAT,2", "METRIC", "%", "G90", "G05", "M30"].join(
    "\n",
  );
  expect(parseExcellon(empty).holes).toHaveLength(0);
});

test("plating falls back to unknown without a TA.AperFunction comment", () => {
  const noAttr = [
    "M48",
    "METRIC",
    "T1C0.400",
    "%",
    "T1",
    "X1.0Y2.0",
    "M30",
  ].join("\n");
  const round = circles(parseExcellon(noAttr).holes);
  expect(round).toHaveLength(1);
  expect(round[0]!.plating).toBe("unknown");
});

test("inch files are converted to millimetres", () => {
  const inch = ["M48", "INCH", "T1C0.0394", "%", "T1", "X1.0Y0.0", "M30"].join(
    "\n",
  );
  const { units, holes } = parseExcellon(inch);
  expect(units).toBe("inch");
  const round = circles(holes);
  expect(round[0]!.diameter).toBeCloseTo(1.0, 2); // 0.0394in ≈ 1mm
  expect(round[0]!.x).toBeCloseTo(25.4, 6);
});

test("a multi-segment slot only records cutting (G01) moves in its centerline", () => {
  const routed = [
    "M48",
    "METRIC",
    "; #@! TA.AperFunction,Plated,PTH,ComponentDrill",
    "T1C0.500",
    "%",
    "T1",
    "G00X0.0Y0.0",
    "M15",
    "G01X0.0Y1.0",
    "G01X1.0Y1.0",
    "M16",
    "G05",
    "M30",
  ].join("\n");
  const { holes } = parseExcellon(routed);
  const slot = holes.find((h) => h.kind === "slot");
  expect(slot).toBeDefined();
  if (slot?.kind === "slot") {
    expect(slot.path).toHaveLength(3);
    expect(slot.path[0]).toMatchObject({ x: 0, y: 0 });
    expect(slot.length).toBeCloseTo(2 + 0.5, 6);
  }
});

test("T0 deselects the active tool so trailing coordinates drill nothing", () => {
  const deselect = [
    "M48",
    "METRIC",
    "T1C0.400",
    "%",
    "T1",
    "X1.0Y1.0",
    "T0",
    "X2.0Y2.0",
    "M30",
  ].join("\n");
  expect(circles(parseExcellon(deselect).holes)).toHaveLength(1);
});

test("a TD attribute comment resets pending plating to unknown", () => {
  const reset = [
    "M48",
    "METRIC",
    "; #@! TA.AperFunction,Plated,PTH,ViaDrill",
    "; #@! TD",
    "T1C0.400",
    "%",
    "T1",
    "X1.0Y1.0",
    "M30",
  ].join("\n");
  const round = circles(parseExcellon(reset).holes);
  expect(round).toHaveLength(1);
  expect(round[0]!.plating).toBe("unknown");
});
