import { expect, test } from "bun:test";
import { Effect } from "effect";
import type { DrcViolation } from "./schema";
import {
  buildIsolationDru,
  compileIgnorePatterns,
  partitionViolations,
  violationText,
} from "./runIsolationDrc";

const antennaViolation: DrcViolation = {
  type: "clearance",
  severity: "error",
  description:
    "Clearance violation (board minimum clearance 0.1977 mm; actual 0.0000 mm)",
  items: [
    { description: "Pad 2 [GND] of AE1 on F.Cu" },
    { description: "Polygon [<no net>] of AE1 on F.Cu" },
  ],
};
const realViolation: DrcViolation = {
  type: "clearance",
  severity: "error",
  description: "Clearance violation",
  items: [
    { description: "Track [Net-(U1-PA0)] on F.Cu" },
    { description: "Pad 3 [Net-(U1-PA0)] of U1 on F.Cu" },
  ],
};

const compile = (patterns: readonly string[]) =>
  Effect.runSync(compileIgnorePatterns(patterns));

test("DRU encodes the effective diameter as the clearance min", () => {
  const dru = buildIsolationDru(0.19773502691896, ["F.Cu", "B.Cu"]);
  expect(dru).toContain("(constraint clearance (min 0.1977mm))");
  expect(dru).toContain("(version 1)");
  expect(dru).toContain("flatmaxx_vbit_isolation");
});

test("DRU scopes to the machined copper layers", () => {
  const front = buildIsolationDru(0.2, ["F.Cu"]);
  expect(front).toContain("A.existsOnLayer('F.Cu')");
  expect(front).not.toContain("B.Cu");

  const both = buildIsolationDru(0.2, ["F.Cu", "B.Cu"]);
  expect(both).toContain("A.existsOnLayer('F.Cu') || A.existsOnLayer('B.Cu')");
});

test("DRU covers all copper feature types", () => {
  const dru = buildIsolationDru(0.2, ["F.Cu"]);
  ["pad", "track", "via", "zone"].forEach((type) => {
    expect(dru).toContain(`A.Type == '${type}'`);
  });
});

test("violationText includes the description and every feature", () => {
  const text = violationText(antennaViolation);
  expect(text).toContain("board minimum clearance 0.1977");
  expect(text).toContain("Pad 2 [GND] of AE1 on F.Cu");
  expect(text).toContain("Polygon [<no net>] of AE1 on F.Cu");
});

test("ignore regex excludes only matching violations", () => {
  const patterns = compile(["AE1"]);
  const { blocking, ignored } = partitionViolations(
    [antennaViolation, realViolation],
    patterns,
  );
  expect(ignored).toEqual([antennaViolation]);
  expect(blocking).toEqual([realViolation]);
});

test("no ignore patterns means everything blocks", () => {
  const { blocking, ignored } = partitionViolations(
    [antennaViolation, realViolation],
    compile([]),
  );
  expect(ignored).toHaveLength(0);
  expect(blocking).toHaveLength(2);
});

test("compileIgnorePatterns fails with a clear error on a bad regex", () => {
  const result = Effect.runSync(compileIgnorePatterns(["("]).pipe(Effect.flip));
  expect(result.message).toContain("validation.isolationFeasibility.ignore");
});
